import { stat } from "node:fs/promises";
import { join } from "node:path";
import glob from "fast-glob";
import mime from "mime-types";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import { hashFile } from "./hashing";
import { uploadFile } from "./s3";
import { chunk } from "./util/chunk";
import { debug } from "./debug";
import { getAuthToken } from "./auth";
import { getConfigFromOptions } from "./config";

const CHUNK_SIZE = 10;

function getContentType(filePath: string): string {
  return mime.lookup(filePath) || "application/octet-stream";
}

export interface DeployParameters {
  /**
   * Directory containing the static files to deploy.
   */
  root: string;

  /**
   * Argos repository access token.
   */
  token?: string;

  /**
   * Base URL of the Argos API.
   * @default "https://api.argos-ci.com/v2/"
   */
  apiBaseUrl?: string;

  /**
   * Git commit SHA of the deployment.
   */
  commit?: string;

  /**
   * Git branch name of the deployment.
   */
  branch?: string;

  /**
   * Pull request number associated with the deployment.
   */
  prNumber?: number;

  /**
   * Deployment environment.
   * @default "preview"
   */
  environment?: "preview" | "production";
}

/**
 * Deploy a static site (e.g. Storybook) to Argos.
 */
export async function deploy(params: DeployParameters) {
  debug("Starting upload with params", params);

  // Read config
  const config = await getConfigFromOptions(params);

  const authToken = getAuthToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  debug("Listing files in", params.root);
  const relativePaths = await glob("**/*", {
    cwd: params.root,
    onlyFiles: true,
    dot: true,
  });

  if (relativePaths.length === 0) {
    throw new Error(`No files found in directory: ${params.root}`);
  }

  debug(`Found ${relativePaths.length} files`);

  const files = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = join(params.root, relativePath);
      const [hash, stats] = await Promise.all([
        hashFile(absolutePath),
        stat(absolutePath),
      ]);
      return {
        absolutePath,
        path: relativePath,
        hash,
        size: stats.size,
        contentType: getContentType(absolutePath),
      };
    }),
  );

  debug("Creating deployment");
  const createResponse = await apiClient.POST("/deployments", {
    body: {
      commit: config.commit ?? null,
      branch: config.branch ?? null,
      prNumber: config.prNumber ?? null,
      environment: params.environment,
      files: files.map(({ path, hash, size, contentType }) => ({
        path,
        hash,
        size,
        contentType,
      })),
    },
  });

  if (createResponse.error) {
    throwAPIError(createResponse.error);
  }

  const { deploymentId, uploadFiles: filesToUpload } = createResponse.data;
  debug(
    `Deployment created: ${deploymentId}, files to upload: ${filesToUpload.length}`,
  );

  const uploads = filesToUpload.map(({ path, uploadUrl }) => {
    const file = files.find((f) => f.path === path);
    if (!file) {
      throw new Error(`Invariant: file not found for path: ${path}`);
    }
    return {
      url: uploadUrl,
      path: file.absolutePath,
      contentType: file.contentType,
    };
  });

  const uploadChunks = chunk(uploads, CHUNK_SIZE);
  for (let i = 0; i < uploadChunks.length; i++) {
    const uploadChunk = uploadChunks[i];
    if (!uploadChunk) {
      continue;
    }
    debug(`Uploading chunk ${i + 1}/${uploadChunks.length}`);
    await Promise.all(
      uploadChunk.map(({ url, path, contentType }) =>
        uploadFile({ url, path, contentType }),
      ),
    );
  }

  debug("Finalizing deployment");
  const finalizeResponse = await apiClient.POST(
    "/deployments/{deploymentId}/finalize",
    {
      params: { path: { deploymentId } },
    },
  );

  if (finalizeResponse.error) {
    throwAPIError(finalizeResponse.error);
  }

  return finalizeResponse.data;
}
