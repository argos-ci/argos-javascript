import { readConfig } from "./config";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { createArgosApiClient, getBearerToken } from "./api-client";
import { upload as uploadToS3 } from "./s3";
import { debug, debugTime, debugTimeEnd } from "./debug";
import { chunk } from "./util/chunk";
import { getPlaywrightTracePath, readMetadata } from "@argos-ci/util";
import { getArgosCoreSDKIdentifier } from "./version";

/**
 * Size of the chunks used to upload screenshots to Argos.
 */
const CHUNK_SIZE = 10;

export interface UploadParameters {
  /**
   * Globs matching image file paths to upload
   */
  files?: string[];
  /**
   * Root directory to look for image to upload
   * @default process.cwd()
   */
  root?: string;
  /**
   * Globs matching image file paths to ignore
   * @default ["**\/*.\{png,jpg,jpeg\}"]
   */
  ignore?: string[];
  /**
   * Base URL of Argos API
   * @default "https://api.argos-ci.com/v2/"
   */
  apiBaseUrl?: string;
  /**
   * Git commit
   */
  commit?: string;
  /**
   * Git branch
   */
  branch?: string;
  /**
   * Argos repository token
   */
  token?: string;
  /**
   * Pull-request number
   */
  prNumber?: number;
  /**
   * Name of the build used to trigger multiple Argos builds on one commit
   */
  buildName?: string;
  /**
   * Mode of comparison applied
   * @default "ci"
   */
  mode?: "ci" | "monitoring";
  /**
   Parallel test suite mode
   */
  parallel?:
    | {
        /** Unique build ID for this parallel build */
        nonce: string;
        /** The number of parallel nodes being ran */
        total: number;
        /** The index of the parallel node */
        index?: number;
      }
    | false;
  /**
   * Branch used as baseline for screenshot comparison
   */
  referenceBranch?: string;
  /**
   * Commit used as baseline for screenshot comparison
   */
  referenceCommit?: string;
  /**
   * Sensitivity threshold between 0 and 1.
   * The higher the threshold, the less sensitive the diff will be.
   * @default 0.5
   */
  threshold?: number;
}

async function getConfigFromOptions({
  parallel,
  ...options
}: UploadParameters) {
  return readConfig({
    ...options,
    parallel: Boolean(parallel),
    parallelNonce: parallel ? parallel.nonce : null,
    parallelTotal: parallel ? parallel.total : null,
    parallelIndex: parallel ? parallel.index : null,
  });
}

async function uploadFilesToS3(
  files: { url: string; path: string; contentType: string }[],
) {
  debug(`Split files in chunks of ${CHUNK_SIZE}`);
  const chunks = chunk(files, CHUNK_SIZE);

  debug(`Starting upload of ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    // Upload files
    debug(`Uploading chunk ${i + 1}/${chunks.length}`);
    const timeLabel = `Chunk ${i + 1}/${chunks.length}`;
    debugTime(timeLabel);
    const chunk = chunks[i];
    if (!chunk) {
      throw new Error(`Invariant: chunk ${i} is empty`);
    }
    await Promise.all(
      chunk.map(async ({ url, path, contentType }) => {
        await uploadToS3({
          url,
          path,
          contentType,
        });
      }),
    );
    debugTimeEnd(timeLabel);
  }
}

/**
 * Upload screenshots to argos-ci.com.
 */
export async function upload(params: UploadParameters) {
  debug("Starting upload with params", params);

  // Read config
  const [config, argosSdk] = await Promise.all([
    getConfigFromOptions(params),
    getArgosCoreSDKIdentifier(),
  ]);
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

      const threshold = metadata?.transient?.threshold ?? null;
      const baseName = metadata?.transient?.baseName ?? null;

      if (metadata) {
        delete metadata.transient;
      }

      return {
        ...screenshot,
        hash,
        optimizedPath,
        metadata,
        threshold,
        baseName,
        pwTrace:
          pwTracePath && pwTraceHash
            ? { path: pwTracePath, hash: pwTraceHash }
            : null,
      };
    }),
  );

  // Create build
  debug("Creating build");
  const [pwTraceKeys, screenshotKeys] = screenshots.reduce(
    ([pwTraceKeys, screenshotKeys], screenshot) => {
      if (
        screenshot.pwTrace &&
        !pwTraceKeys.includes(screenshot.pwTrace.hash)
      ) {
        pwTraceKeys.push(screenshot.pwTrace.hash);
      }
      if (!screenshotKeys.includes(screenshot.hash)) {
        screenshotKeys.push(screenshot.hash);
      }
      return [pwTraceKeys, screenshotKeys];
    },
    [[], []] as [string[], string[]],
  );
  const result = await apiClient.createBuild({
    commit: config.commit,
    branch: config.branch,
    name: config.buildName,
    mode: config.mode,
    parallel: config.parallel,
    parallelNonce: config.parallelNonce,
    screenshotKeys,
    pwTraceKeys,
    prNumber: config.prNumber,
    prHeadCommit: config.prHeadCommit,
    referenceBranch: config.referenceBranch,
    referenceCommit: config.referenceCommit,
    argosSdk,
    ciProvider: config.ciProvider,
    runId: config.runId,
    runAttempt: config.runAttempt,
  });

  debug("Got uploads url", result);

  const uploadFiles = [
    ...result.screenshots.map(({ key, putUrl }) => {
      const screenshot = screenshots.find((s) => s.hash === key);
      if (!screenshot) {
        throw new Error(`Invariant: screenshot with hash ${key} not found`);
      }
      return {
        url: putUrl,
        path: screenshot.optimizedPath,
        contentType: "image/png",
      };
    }),
    ...(result.pwTraces?.map(({ key, putUrl }) => {
      const screenshot = screenshots.find(
        (s) => s.pwTrace && s.pwTrace.hash === key,
      );
      if (!screenshot || !screenshot.pwTrace) {
        throw new Error(`Invariant: trace with ${key} not found`);
      }
      return {
        url: putUrl,
        path: screenshot.pwTrace.path,
        contentType: "application/json",
      };
    }) ?? []),
  ];

  await uploadFilesToS3(uploadFiles);

  // Update build
  debug("Updating build");

  await apiClient.updateBuild({
    buildId: result.build.id,
    screenshots: screenshots.map((screenshot) => ({
      key: screenshot.hash,
      name: screenshot.name,
      metadata: screenshot.metadata,
      pwTraceKey: screenshot.pwTrace?.hash ?? null,
      threshold: screenshot.threshold ?? config?.threshold ?? null,
      baseName: screenshot.baseName,
    })),
    parallel: config.parallel,
    parallelTotal: config.parallelTotal,
    parallelIndex: config.parallelIndex,
  });

  return { build: result.build, screenshots };
}
