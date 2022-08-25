import { createConfig } from "./config";
import { omitUndefined } from "./util";
import { getCiEnvironment } from "./ci-environment";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { createArgosApiClient } from "./api-client";
import { upload as uploadToS3 } from "./s3";
import { debug } from "./debug";

export interface UploadParameters {
  /** Globs matching image file paths to upload */
  files?: string[];
  /** Root directory to look for image to upload (default to current directory) */
  root?: string;
  /** Globs matching image file paths to ignore (default to "**\/*.{png,jpg,jpeg}") */
  ignore?: string[];
  /** Base URL of Argos API (default to "https://api.argos-ci.com/v2/") */
  apiBaseUrl?: string;
  /** Git commit */
  commit?: string;
  /** Git branch */
  branch?: string;
  /** Argos repository token */
  token?: string;
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
  const { apiBaseUrl, commit, branch, token, buildName, parallel } = options;

  const config = createConfig();
  config.load(
    omitUndefined({
      apiBaseUrl,
      commit,
      branch,
      token,
      buildName,
      parallel: Boolean(parallel),
      parallelNonce: parallel ? parallel.nonce : null,
      parallelTotal: parallel ? parallel.total : null,
    })
  );

  if (!config.get("commit")) {
    const ciEnv = getCiEnvironment();
    if (ciEnv) {
      config.load(
        omitUndefined({
          commit: ciEnv.commit,
          branch: ciEnv.branch,
          ciService: ciEnv.name,
        })
      );
    }
  }

  config.validate();

  return config.get();
};

/**
 * Upload screenshots to argos-ci.com.
 */
export const upload = async (params: UploadParameters) => {
  // Read config
  const config = getConfigFromOptions(params);
  const files = params.files ?? ["**/*.{png,jpg,jpeg}"];

  // Collect screenshots
  const foundScreenshots = await discoverScreenshots(files, {
    root: params.root,
    ignore: params.ignore,
  });

  // Optimize & compute hashes
  const screenshots = await Promise.all(
    foundScreenshots.map(async (screenshot) => {
      const optimizedPath = await optimizeScreenshot(screenshot.path);
      const hash = await hashFile(optimizedPath);
      return { ...screenshot, optimizedPath, hash };
    })
  );

  const apiClient = createArgosApiClient({
    baseUrl: config.apiBaseUrl,
    token: config.token,
  });

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
      await uploadToS3({ url: putUrl, path: screenshot.optimizedPath });
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
