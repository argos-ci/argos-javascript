import { createConfig } from "./config";
import { getCiEnvironment } from "./ci-environment";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { createArgosApiClient, getBearerToken } from "./api-client";
import { upload as uploadToS3 } from "./s3";
import { debug, debugTime, debugTimeEnd } from "./debug";
import { chunk } from "./util/chunk";
import { readMetadata } from "@argos-ci/util";

/**
 * Size of the chunks used to upload screenshots to Argos.
 */
const CHUNK_SIZE = 10;

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
  /** Branch used as baseline for screenshot comparison */
  referenceBranch?: string;
  /** Commit used as baseline for screenshot comparison */
  referenceCommit?: string;
}

const getConfigFromOptions = (options: UploadParameters) => {
  const config = createConfig();

  const ciEnv = getCiEnvironment();

  config.load({
    apiBaseUrl: options.apiBaseUrl ?? config.get("apiBaseUrl"),
    commit: options.commit ?? config.get("commit") ?? ciEnv?.commit ?? null,
    branch: options.branch ?? config.get("branch") ?? ciEnv?.branch ?? null,
    token: options.token ?? config.get("token") ?? null,
    buildName: options.buildName ?? config.get("buildName") ?? null,
    prNumber:
      options.prNumber ?? config.get("prNumber") ?? ciEnv?.prNumber ?? null,
    prHeadCommit: config.get("prHeadCommit") ?? ciEnv?.prHeadCommit ?? null,
    referenceBranch:
      options.referenceBranch ?? config.get("referenceBranch") ?? null,
    referenceCommit:
      options.referenceCommit ?? config.get("referenceCommit") ?? null,
    ciService: ciEnv?.name ?? null,
    owner: ciEnv?.owner ?? null,
    repository: ciEnv?.repository ?? null,
    jobId: ciEnv?.jobId ?? null,
    runId: ciEnv?.runId ?? null,
  });

  if (options.parallel) {
    config.load({
      parallel: Boolean(options.parallel),
      parallelNonce: options.parallel ? options.parallel.nonce : null,
      parallelTotal: options.parallel ? options.parallel.total : null,
    });
  }

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
      const [metadata, optimizedPath] = await Promise.all([
        readMetadata(screenshot.path),
        optimizeScreenshot(screenshot.path),
      ]);
      const hash = await hashFile(optimizedPath);
      return { ...screenshot, metadata, optimizedPath, hash };
    }),
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
      new Set(screenshots.map((screenshot) => screenshot.hash)),
    ),
    prNumber: config.prNumber,
    prHeadCommit: config.prHeadCommit,
    referenceBranch: config.referenceBranch,
    referenceCommit: config.referenceCommit,
  });

  debug("Got screenshots", result);

  debug(`Split screenshots in chunks of ${CHUNK_SIZE}`);
  const chunks = chunk(result.screenshots, CHUNK_SIZE);

  debug(`Starting upload of ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    debug(`Uploading chunk ${i + 1}/${chunks.length}`);
    const timeLabel = `Chunk ${i + 1}/${chunks.length}`;
    debugTime(timeLabel);
    await Promise.all(
      chunks[i].map(async ({ key, putUrl }) => {
        const screenshot = screenshots.find((s) => s.hash === key);
        if (!screenshot) {
          throw new Error(`Invariant: screenshot with hash ${key} not found`);
        }
        await uploadToS3({
          url: putUrl,
          path: screenshot.optimizedPath,
        });
      }),
    );
    debugTimeEnd(timeLabel);
  }

  // Update build
  debug("Updating build");
  await apiClient.updateBuild({
    buildId: result.build.id,
    screenshots: screenshots.map((screenshot) => ({
      key: screenshot.hash,
      name: screenshot.name,
      metadata: screenshot.metadata,
    })),
    parallel: config.parallel,
    parallelTotal: config.parallelTotal,
  });

  return { build: result.build, screenshots };
};
