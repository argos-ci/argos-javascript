import type { ArgosAPISchema } from "@argos-ci/api-client";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import { readConfig } from "./config";
import { discoverScreenshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { getAuthToken } from "./auth";
import { upload as uploadToS3 } from "./s3";
import { debug, debugTime, debugTimeEnd } from "./debug";
import { chunk } from "./util/chunk";
import { getPlaywrightTracePath, readMetadata } from "@argos-ci/util";
import { getArgosCoreSDKIdentifier } from "./version";
import { getMergeBaseCommitSha, listParentCommits } from "./ci-environment";

/**
 * Size of the chunks used to upload screenshots to Argos.
 */
const CHUNK_SIZE = 10;

type BuildMetadata = ArgosAPISchema.components["schemas"]["BuildMetadata"];

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
  /**
   * Build metadata.
   */
  metadata?: BuildMetadata;
  /**
   * Preview URL configuration.
   * Accepts a base URL or a function that receives the URL and returns the preview URL.
   */
  previewUrl?:
    | {
        baseUrl: string;
      }
    | ((url: string) => string);
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
 * Format the preview URL.
 */
function formatPreviewUrl(
  url: string,
  formatter: NonNullable<UploadParameters["previewUrl"]>,
) {
  if (typeof formatter === "function") {
    return formatter(url);
  }
  const urlObj = new URL(url);
  return new URL(
    urlObj.pathname + urlObj.search + urlObj.hash,
    formatter.baseUrl,
  ).href;
}

/**
 * Upload screenshots to Argos.
 */
export async function upload(params: UploadParameters) {
  debug("Starting upload with params", params);

  // Read config
  const [config, argosSdk] = await Promise.all([
    getConfigFromOptions(params),
    getArgosCoreSDKIdentifier(),
  ]);
  const previewUrlFormatter: UploadParameters["previewUrl"] =
    params.previewUrl ??
    (config.previewBaseUrl ? { baseUrl: config.previewBaseUrl } : undefined);

  const files = params.files ?? ["**/*.{png,jpg,jpeg}"];
  debug("Using config and files", config, files);

  const authToken = getAuthToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
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

        if (metadata.url && previewUrlFormatter) {
          metadata.previewUrl = formatPreviewUrl(
            metadata.url,
            previewUrlFormatter,
          );
        }
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

  debug("Fetch project");
  const projectResponse = await apiClient.GET("/project");
  if (projectResponse.error) {
    throwAPIError(projectResponse.error);
  }
  debug("Project fetched", projectResponse.data);

  const { defaultBaseBranch, hasRemoteContentAccess } = projectResponse.data;

  const referenceCommit = (() => {
    if (config.referenceCommit) {
      debug("Found reference commit in config", config.referenceCommit);
      return config.referenceCommit;
    }

    // If we have remote access, we will fetch it from the Git Provider.
    if (hasRemoteContentAccess) {
      return null;
    }

    // We use the pull request as base branch if possible
    // else branch specified by the user or the default branch.
    const base =
      config.referenceBranch || config.prBaseBranch || defaultBaseBranch;

    const sha = getMergeBaseCommitSha({ base, head: config.branch });

    if (sha) {
      debug("Found merge base", sha);
    } else {
      debug("No merge base found");
    }

    return sha;
  })();

  const parentCommits = (() => {
    // If we have remote access, we will fetch them from the Git Provider.
    if (hasRemoteContentAccess) {
      return null;
    }

    if (referenceCommit) {
      const commits = listParentCommits({ sha: referenceCommit });
      if (commits) {
        debug("Found parent commits", commits);
      } else {
        debug("No parent commits found");
      }
      return commits;
    }

    return null;
  })();

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

  const createBuildResponse = await apiClient.POST("/builds", {
    body: {
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
      referenceCommit,
      parentCommits,
      argosSdk,
      ciProvider: config.ciProvider,
      runId: config.runId,
      runAttempt: config.runAttempt,
    },
  });

  if (createBuildResponse.error) {
    throwAPIError(createBuildResponse.error);
  }

  const result = createBuildResponse.data;

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

  const uploadBuildResponse = await apiClient.PUT("/builds/{buildId}", {
    params: {
      path: {
        buildId: result.build.id,
      },
    },
    body: {
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
      metadata: params.metadata,
    },
  });

  if (uploadBuildResponse.error) {
    throwAPIError(uploadBuildResponse.error);
  }

  return { build: uploadBuildResponse.data.build, screenshots };
}
