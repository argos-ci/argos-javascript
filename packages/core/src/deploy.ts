import { stat } from "node:fs/promises";
import { join } from "node:path";
import glob from "fast-glob";
import mime from "mime-types";
import type { ArgosAPIClient, ArgosAPISchema } from "@argos-ci/api-client";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import { hashFile } from "./hashing";
import { uploadFile } from "./s3";
import { chunk } from "./util/chunk";
import { debug } from "./debug";
import { resolveArgosToken } from "./auth";
import { getConfigFromOptions } from "./config";

const CHUNK_SIZE = 10;

function getContentType(filePath: string): string {
  return mime.lookup(filePath) || "application/octet-stream";
}

interface DeployBaseParameters {
  /**
   * Argos repository access token.
   */
  token?: string;

  /**
   * Argos project slug (`account/project`).
   * Required when the token is linked to several projects.
   * @default process.env.ARGOS_PROJECT
   */
  project?: string;

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
   * Inferred from the branch when omitted.
   */
  environment?: "preview" | "production";
}

/**
 * Deploy a static build on Argos.
 */
export interface DeployFilesParameters extends DeployBaseParameters {
  /**
   * Directory containing the static files to deploy.
   */
  root: string;
  url?: never;
}

/**
 * Report a deployment hosted elsewhere.
 */
export interface DeployUrlParameters extends DeployBaseParameters {
  /**
   * URL of a deployment hosted elsewhere, such as a Vercel or Netlify preview.
   * Argos links it to the builds of the same commit, and links each screenshot
   * to the same page on it.
   */
  url: string;
  root?: never;
}

export type DeployParameters = DeployFilesParameters | DeployUrlParameters;

export type Deployment =
  ArgosAPISchema.operations["getDeployment"]["responses"][200]["content"]["application/json"];

/** What a deployment is about, sent whether Argos hosts it or not. */
type DeploymentBody = Omit<
  NonNullable<
    ArgosAPISchema.operations["createDeployment"]["requestBody"]
  >["content"]["application/json"],
  "files" | "url"
>;

/**
 * Deploy a static site (e.g. Storybook) to Argos, or report a deployment
 * hosted elsewhere (Vercel, Netlify, Cloudflare…).
 *
 * Pass `root` to upload a directory that Argos hosts, or `url` to tell Argos
 * where the commit is deployed. Either way, Argos links the deployment to the
 * builds of the same commit.
 */
export async function deploy(params: DeployParameters): Promise<Deployment> {
  const { token: _token, ...debugParams } = params;
  debug("Starting deploy with params", debugParams);

  if (params.root !== undefined && params.url !== undefined) {
    throw new Error(
      "`root` and `url` can't be used together. Pass `root` to deploy files on Argos, or `url` for a deployment hosted elsewhere.",
    );
  }

  // Read config
  const config = await getConfigFromOptions(params);

  const authToken = await resolveArgosToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  const body: DeploymentBody = {
    project: config.project ?? undefined,
    commit: config.commit ?? null,
    branch: config.branch ?? null,
    prNumber: config.prNumber ?? null,
    // Argos reports the deployment status on the pull request head, which
    // is the wrong commit in a merge queue: there the status belongs to the
    // merge group commit, as it does for builds.
    prHeadCommit: config.mergeQueuePrNumbers ? null : config.prHeadCommit,
    environment: params.environment,
  };

  if (params.url !== undefined) {
    return reportDeployment({ apiClient, body, url: params.url });
  }

  return deployFiles({ apiClient, body, root: params.root });
}

type DeployInput = {
  apiClient: ArgosAPIClient;
  body: DeploymentBody;
};

/**
 * Report a deployment hosted elsewhere. Argos creates it ready, so there is
 * nothing to upload or finalize.
 */
async function reportDeployment(
  input: DeployInput & { url: string },
): Promise<Deployment> {
  const { apiClient, body, url } = input;

  debug("Reporting deployment", url);
  const createResponse = await apiClient.POST("/deployments", {
    body: { ...body, url },
  });

  if (createResponse.error) {
    throwAPIError(createResponse.error, createResponse.response);
  }

  const { deploymentId } = createResponse.data;
  debug(`Deployment reported: ${deploymentId}`);

  // Read it back so both kinds of deployment resolve to the same shape, with
  // the URL as Argos normalized it.
  const getResponse = await apiClient.GET("/deployments/{deploymentId}", {
    params: { path: { deploymentId } },
  });

  if (getResponse.error) {
    throwAPIError(getResponse.error, getResponse.response);
  }

  return getResponse.data;
}

/**
 * Upload the files of a static build that Argos hosts, then finalize the
 * deployment.
 */
async function deployFiles(
  input: DeployInput & { root: string },
): Promise<Deployment> {
  const { apiClient, body, root } = input;

  debug("Listing files in", root);
  const relativePaths = await glob("**/*", {
    cwd: root,
    onlyFiles: true,
    dot: true,
  });

  if (relativePaths.length === 0) {
    throw new Error(`No files found in directory: ${root}`);
  }

  debug(`Found ${relativePaths.length} files`);

  const files = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = join(root, relativePath);
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
  const filesByPath = new Map(files.map((file) => [file.path, file]));

  debug("Creating deployment");
  const createResponse = await apiClient.POST("/deployments", {
    body: {
      ...body,
      files: files.map(({ path, hash, size, contentType }) => ({
        path,
        hash,
        size,
        contentType,
      })),
    },
  });

  if (createResponse.error) {
    throwAPIError(createResponse.error, createResponse.response);
  }

  const { deploymentId, uploadFiles: filesToUpload } = createResponse.data;
  debug(
    `Deployment created: ${deploymentId}, files to upload: ${filesToUpload.length}`,
  );

  const uploads = filesToUpload.map(({ path, uploadUrl }) => {
    const file = filesByPath.get(path);
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
    throwAPIError(finalizeResponse.error, finalizeResponse.response);
  }

  return finalizeResponse.data;
}
