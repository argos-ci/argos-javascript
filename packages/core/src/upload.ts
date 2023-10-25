import { readConfig } from "./config";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { createArgosApiClient, getBearerToken } from "./api-client";
import { upload as uploadToS3 } from "./s3";
import { debug, debugTime, debugTimeEnd } from "./debug";
import { chunk } from "./util/chunk";
import { getPlaywrightTracePath, readMetadata } from "@argos-ci/util";

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

const getConfigFromOptions = ({ parallel, ...options }: UploadParameters) => {
  const config = readConfig({
    ...options,
    parallel: Boolean(parallel),
    parallelNonce: parallel ? parallel.nonce : null,
    parallelTotal: parallel ? parallel.total : null,
  });
  return config;
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
      const [metadata, pwTracePath, optimizedPath] = await Promise.all([
        readMetadata(screenshot.path),
        getPlaywrightTracePath(screenshot.path),
        optimizeScreenshot(screenshot.path),
      ]);
      const [hash, pwTraceHash] = await Promise.all([
        hashFile(optimizedPath),
        pwTracePath ? hashFile(pwTracePath) : null,
      ]);
      return {
        ...screenshot,
        hash,
        optimizedPath,
        metadata,
        pwTrace:
          pwTracePath && pwTraceHash
            ? { path: pwTracePath, hash: pwTraceHash }
            : null,
      };
    }),
  );

  // Create build
  debug("Creating build");
  const screenshotKeys = Array.from(
    new Set(screenshots.map((screenshot) => screenshot.hash)),
  );
  const pwTraces = screenshotKeys.reduce(
    (pwTraces, key) => {
      const screenshot = screenshots.find(
        (screenshot) => screenshot.hash === key,
      );
      if (!screenshot) {
        throw new Error(`Invariant: screenshot with hash ${key} not found`);
      }
      if (screenshot.pwTrace) {
        pwTraces.push({
          screenshotKey: screenshot.hash,
          traceKey: screenshot.pwTrace.hash,
        });
      }
      return pwTraces;
    },
    [] as { screenshotKey: string; traceKey: string }[],
  );
  const result = await apiClient.createBuild({
    commit: config.commit,
    branch: config.branch,
    name: config.buildName,
    parallel: config.parallel,
    parallelNonce: config.parallelNonce,
    screenshotKeys,
    pwTraces,
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
    // Upload screenshots
    debug(`Uploading chunk ${i + 1}/${chunks.length}`);
    const timeLabel = `Chunk ${i + 1}/${chunks.length}`;
    debugTime(timeLabel);
    await Promise.all(
      chunks[i].map(async ({ key, putUrl, putTraceUrl }) => {
        const screenshot = screenshots.find((s) => s.hash === key);
        if (!screenshot) {
          throw new Error(`Invariant: screenshot with hash ${key} not found`);
        }
        await Promise.all([
          // Upload screenshot
          uploadToS3({
            url: putUrl,
            path: screenshot.optimizedPath,
            contentType: "image/png",
          }),
          // Upload trace
          (async () => {
            if (putTraceUrl) {
              if (!screenshot.pwTrace) {
                throw new Error(
                  `Invariant: screenshot with hash ${key} has a putTraceUrl but no pwTrace`,
                );
              }
              await uploadToS3({
                url: putTraceUrl,
                path: screenshot.pwTrace.path,
                contentType: "application/zip",
              });
            }
          })(),
        ]);
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
      pwTraceKey: screenshot.pwTrace?.hash ?? null,
    })),
    parallel: config.parallel,
    parallelTotal: config.parallelTotal,
  });

  return { build: result.build, screenshots };
};
