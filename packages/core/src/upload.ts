import type { ArgosAPISchema } from "@argos-ci/api-client";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import { getConfigFromOptions } from "./config";
import { discoverSnapshots } from "./discovery";
import { optimizeScreenshot } from "./optimize";
import { hashFile } from "./hashing";
import { getAuthToken } from "./auth";
import { uploadFile } from "./s3";
import { debug, debugTime, debugTimeEnd } from "./debug";
import { chunk } from "./util/chunk";
import {
  getPlaywrightTracePath,
  readMetadata,
  type ScreenshotMetadata,
} from "@argos-ci/util";
import { getArgosCoreSDKIdentifier } from "./version";
import { getMergeBaseCommitSha, listParentCommits } from "./ci-environment";
import { getSnapshotMimeType } from "./mime-type";
import { skip } from "./skip";

/**
 * Size of the chunks used to upload screenshots to Argos.
 */
const CHUNK_SIZE = 10;

type BuildMetadata = ArgosAPISchema.components["schemas"]["BuildMetadata"];

export interface UploadParameters {
  /**
   * Globs that match image file paths to upload.
   */
  files?: string[];

  /**
   * Root directory used to resolve image paths.
   * @default process.cwd()
   */
  root?: string;

  /**
   * Globs that match image file paths to exclude from upload.
   * @default ["**\/*.{png,jpg,jpeg}"]
   */
  ignore?: string[];

  /**
   * Base URL of the Argos API.
   * @default "https://api.argos-ci.com/v2/"
   */
  apiBaseUrl?: string;

  /**
   * Git commit SHA of the build.
   */
  commit?: string;

  /**
   * Git branch name of the build.
   */
  branch?: string;

  /**
   * Argos repository access token.
   */
  token?: string;

  /**
   * Pull request number associated with the build.
   */
  prNumber?: number;

  /**
   * Custom build name. Useful when triggering multiple Argos builds
   * for the same commit.
   */
  buildName?: string;

  /**
   * Build mode to use.
   * - "ci": Review the visual changes introduced by a feature branch and prevent regressions.
   * - "monitoring": Track visual changes outside the standard CI flow, either on a schedule or before a release.
   * @see https://argos-ci.com/docs/build-modes
   * @default "ci"
   */
  mode?: "ci" | "monitoring";

  /**
   * Parallel test suite configuration.
   * @default false
   */
  parallel?:
    | {
        /** Unique build identifier shared across parallel jobs. */
        nonce: string;
        /** Total number of parallel jobs, set to -1 to finalize manually. */
        total: number;
        /** Index of the current job (must start from 1). */
        index?: number;
      }
    | false;

  /**
   * Branch used as the baseline for screenshot comparison.
   */
  referenceBranch?: string;

  /**
   * Commit SHA used as the baseline for screenshot comparison.
   */
  referenceCommit?: string;

  /**
   * Diff sensitivity threshold between 0 and 1.
   * Higher values make Argos less sensitive to differences.
   * @default 0.5
   */
  threshold?: number;

  /**
   * Additional build metadata.
   */
  metadata?: BuildMetadata;

  /**
   * Preview URL configuration.
   * Can be a fixed base URL or a function to transform URLs dynamically.
   */
  previewUrl?:
    | {
        baseUrl: string;
      }
    | ((url: string) => string);
}

interface Screenshot {
  hash: string;
  optimizedPath: string;
  metadata: ScreenshotMetadata | null;
  threshold: number | null;
  baseName: string | null;
  pwTrace: {
    path: string;
    hash: string;
  } | null;
  name: string;
  path: string;
}

/**
 * Upload screenshots to Argos.
 */
export async function upload(params: UploadParameters): Promise<{
  build: ArgosAPISchema.components["schemas"]["Build"];
  screenshots: Screenshot[];
}> {
  debug("Starting upload with params", params);

  // Read config
  const [config, argosSdk] = await Promise.all([
    getConfigFromOptions(params),
    getArgosCoreSDKIdentifier(),
  ]);

  const authToken = getAuthToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  if (config.skipped) {
    const { build } = await skip(params);
    return { build, screenshots: [] };
  }

  const previewUrlFormatter: UploadParameters["previewUrl"] =
    params.previewUrl ??
    (config.previewBaseUrl ? { baseUrl: config.previewBaseUrl } : undefined);

  const globs = params.files ?? ["**/*.{png,jpg,jpeg}"];
  debug("Using config and files", config, globs);

  // Collect snapshots
  const files = await discoverSnapshots(globs, {
    root: params.root,
    ignore: params.ignore,
  });

  debug("Found snapshots", files);

  // Optimize & compute hashes
  const snapshots = await Promise.all(
    files.map(async (snapshot) => {
      const contentType = getSnapshotMimeType(snapshot.path);
      const [metadata, pwTracePath, optimizedPath] = await Promise.all([
        readMetadata(snapshot.path),
        getPlaywrightTracePath(snapshot.path),
        contentType.startsWith("image/")
          ? optimizeScreenshot(snapshot.path)
          : snapshot.path,
      ]);

      const [hash, pwTraceHash] = await Promise.all([
        hashFile(optimizedPath),
        pwTracePath ? hashFile(pwTracePath) : null,
      ]);

      const threshold = metadata?.transient?.threshold ?? null;
      const baseName = metadata?.transient?.baseName ?? null;
      const parentName = metadata?.transient?.parentName ?? null;

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
        ...snapshot,
        hash,
        optimizedPath,
        metadata,
        threshold,
        baseName,
        parentName,
        pwTrace:
          pwTracePath && pwTraceHash
            ? { path: pwTracePath, hash: pwTraceHash }
            : null,
        contentType,
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
  const [pwTraceKeys, snapshotKeys] = snapshots.reduce(
    ([pwTraceKeys, snapshotKeys], snapshot) => {
      if (snapshot.pwTrace && !pwTraceKeys.includes(snapshot.pwTrace.hash)) {
        pwTraceKeys.push(snapshot.pwTrace.hash);
      }
      if (!snapshotKeys.includes(snapshot.hash)) {
        snapshotKeys.push(snapshot.hash);
      }
      return [pwTraceKeys, snapshotKeys];
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
      screenshotKeys: snapshotKeys,
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
      mergeQueue: config.mergeQueue,
    },
  });

  if (createBuildResponse.error) {
    throwAPIError(createBuildResponse.error);
  }

  const result = createBuildResponse.data;

  debug("Got uploads url", result);

  const uploadFiles = [
    ...result.screenshots.map(({ key, putUrl }) => {
      const snapshot = snapshots.find((s) => s.hash === key);
      if (!snapshot) {
        throw new Error(`Invariant: snapshot with hash ${key} not found`);
      }
      return {
        url: putUrl,
        path: snapshot.optimizedPath,
        contentType: snapshot.contentType,
      };
    }),
    ...(result.pwTraces?.map(({ key, putUrl }) => {
      const snapshot = snapshots.find(
        (s) => s.pwTrace && s.pwTrace.hash === key,
      );
      if (!snapshot || !snapshot.pwTrace) {
        throw new Error(`Invariant: trace with ${key} not found`);
      }
      return {
        url: putUrl,
        path: snapshot.pwTrace.path,
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
      screenshots: snapshots.map((snapshot) => ({
        key: snapshot.hash,
        name: snapshot.name,
        metadata: snapshot.metadata,
        pwTraceKey: snapshot.pwTrace?.hash ?? null,
        threshold: snapshot.threshold ?? config?.threshold ?? null,
        baseName: snapshot.baseName,
        parentName: snapshot.parentName,
        contentType: snapshot.contentType,
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

  return { build: uploadBuildResponse.data.build, screenshots: snapshots };
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
        await uploadFile({
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
