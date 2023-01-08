import { createConfig } from "./config";
import { omitUndefined } from "./util";
import { getCiEnvironment } from "./ci-environment";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { createArgosApiClient, getBearerToken } from "./api-client";
import { upload as uploadToS3 } from "./s3";
import { debug } from "./debug";

export interface UploadParameters {
  /** Globs matching image file paths to upload */
  files?: string[];
  /** Root directory to look for image to upload (default to current directory) */
  root?: string;
  /** Globs matching image file paths to ignore (default to "**\/*.\{png,jpg,jpeg\}") */
  ignore?: string[];
  /** Base URL of Argos API (default to "https://api.argos-ci.com/v2/") */
  apiBaseUrl?: string;
  /** Git commit */
  commit?: string;
  /** Git branch */
  branch?: string;
  /** Argos repository token */
  token?: string;
  /** Pull-request number */
  prNumber?: number;
  /** Name of the build used to trigger multiple Argos builds on one commit */
  buildName?: string;
  /** Parallel test suite mode */
  parallel?:
    | {
        /** Unique build ID for this parallel build */
        nonce: string;
        /** The number of parallel nodes being ran */
        total: number;
      }
    | false;
}

const getConfigFromOptions = (options: UploadParameters) => {
  const config = createConfig();

  const ciEnv = getCiEnvironment();
  if (ciEnv) {
    config.load(
      omitUndefined({
        commit: ciEnv.commit,
        branch: ciEnv.branch,
        ciService: ciEnv.name,
        owner: ciEnv.owner,
        repository: ciEnv.repository,
        jobId: ciEnv.jobId,
        runId: ciEnv.runId,
        prNumber: ciEnv.prNumber,
      })
    );
  }

  config.load(
    omitUndefined({
      apiBaseUrl: options.apiBaseUrl,
      commit: options.commit,
      branch: options.branch,
      token: options.token,
      prNumber: options.prNumber,
      buildName: options.buildName,
      parallel: Boolean(options.parallel),
      parallelNonce: options.parallel ? options.parallel.nonce : null,
      parallelTotal: options.parallel ? options.parallel.total : null,
    })
  );

  config.validate();

  return config.get();
};

/**
 * Upload screenshots to argos-ci.com.
 */
export const upload = async (params: UploadParameters) => {
  debug("Starting upload with params", params);

  // Read config
  const config = getConfigFromOptions(params);
  const files = params.files ?? ["**/*.{png,jpg,jpeg}"];
  debug("Using config and files", config, files);

  const apiClient = createArgosApiClient({
    baseUrl: config.apiBaseUrl,
    bearerToken: getBearerToken(config),
  });

  // Collect screenshots
  const foundScreenshots = await discoverScreenshots(files, {
    root: params.root,
    ignore: params.ignore,
  });

  debug("Found screenshots", foundScreenshots);

  // Optimize & compute hashes
  const screenshots = await Promise.all(
    foundScreenshots.map(async (screenshot) => {
      const optimizedPath = await optimizeScreenshot(screenshot.path);
      const hash = await hashFile(optimizedPath);
      return { ...screenshot, optimizedPath, hash };
    })
  );

  // Create build
  debug("Creating build");
  const result = await apiClient.createBuild({
    commit: config.commit,
    branch: config.branch,
    name: config.buildName,
    parallel: config.parallel,
    parallelNonce: config.parallelNonce,
    screenshotKeys: Array.from(
      new Set(screenshots.map((screenshot) => screenshot.hash))
    ),
    prNumber: config.prNumber,
  });

  debug("Got screenshots", result);

  // Upload screenshots
  debug("Uploading screenshots");
  await Promise.all(
    result.screenshots.map(async ({ key, putUrl }) => {
      const screenshot = screenshots.find((s) => s.hash === key);
      if (!screenshot) {
        throw new Error(`Invariant: screenshot with hash ${key} not found`);
      }
      await uploadToS3({
        url: putUrl,
        path: screenshot.optimizedPath,
      });
    })
  );

  // Update build
  debug("Updating build");
  await apiClient.updateBuild({
    buildId: result.build.id,
    screenshots: screenshots.map((screenshot) => ({
      key: screenshot.hash,
      name: screenshot.name,
    })),
    parallel: config.parallel,
    parallelTotal: config.parallelTotal,
  });

  return { build: result.build, screenshots };
};
