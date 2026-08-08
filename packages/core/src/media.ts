import { stat } from "node:fs/promises";
import { basename } from "node:path";
import mime from "mime-types";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { resolveArgosToken } from "./auth";
import { getConfigFromOptions } from "./config";
import { debug } from "./debug";
import { hashFile } from "./hashing";
import { uploadFileWithPresignedPost } from "./s3";

export type Media = ArgosAPISchema.components["schemas"]["Media"];

/**
 * Content types Argos accepts for a standalone media upload. Kept here so a
 * caller learns the file is unsupported before anything is uploaded.
 */
const SUPPORTED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/**
 * Extensions `mime-types` gets wrong or does not know for the formats we accept.
 * `.mov` in particular resolves to `video/quicktime` on most systems but not all.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".mov": "video/quicktime",
  ".avif": "image/avif",
};

export interface UploadMediaParameters {
  /**
   * Paths of the files to upload.
   */
  files: string[];

  /**
   * Argos token. Falls back to `ARGOS_TOKEN` and to CI tokenless
   * authentication, like every other Argos command.
   */
  token?: string;

  /**
   * Base URL of the Argos API.
   * @default "https://api.argos-ci.com/v2/"
   */
  apiBaseUrl?: string;

  /**
   * Project to upload to, as `owner/project`. Required when authenticating with
   * a personal access token; ignored with a project token, which already
   * identifies its project.
   */
  project?: string;

  /**
   * Stable identifier, unique per project. Re-uploading the same slug replaces
   * the file in place, so a Markdown embed already posted to a pull request keeps
   * pointing at the new version instead of going stale.
   *
   * With several files, each one gets the slug suffixed with its index.
   */
  slug?: string;

  /**
   * Who can open the share page. `team` requires an Argos session; `public` only
   * requires the URL. Defaults to the most private option the plan allows.
   */
  visibility?: "team" | "public";

  /**
   * How long to keep the media, in days. Clamped to the plan's maximum.
   */
  retentionDays?: number;

  /**
   * Pull request to attach the media to.
   */
  prNumber?: number;

  /**
   * Maintain a single Argos comment on the pull request listing every media
   * uploaded to it, edited in place rather than appended to. Requires
   * `prNumber`.
   */
  comment?: boolean;
}

/**
 * Upload standalone images or videos to Argos and get back shareable URLs with
 * ready-to-paste Markdown.
 *
 * Not tied to a build or a test run: this is for the screenshot or screen
 * recording you want to put in a pull request, a changelog or a chat message.
 *
 * Argos stores the bytes as given and serves them from its image CDN, so a media
 * is ready the moment the upload finishes — there is no processing to wait on.
 */
export async function uploadMedia(
  params: UploadMediaParameters,
): Promise<Media[]> {
  const { token: _token, ...debugParams } = params;
  debug("Starting media upload with params", debugParams);

  if (params.files.length === 0) {
    throw new Error("No files to upload");
  }

  if (params.comment && !params.prNumber) {
    throw new Error("`prNumber` is required when `comment` is enabled");
  }

  const config = await getConfigFromOptions(params);
  const authToken = await resolveArgosToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  // Sequential rather than concurrent: these are large files, and saturating an
  // uplink with several 500 MB videos makes every one of them slower while making
  // the progress output useless.
  const results: Media[] = [];
  for (const [index, filepath] of params.files.entries()) {
    results.push(
      await uploadOne({
        apiClient,
        filepath,
        params,
        slug: resolveSlug(params, index),
      }),
    );
  }

  return results;
}

async function uploadOne(args: {
  apiClient: ReturnType<typeof createClient>;
  filepath: string;
  params: UploadMediaParameters;
  slug: string | null;
}): Promise<Media> {
  const { apiClient, filepath, params, slug } = args;

  const contentType = getMediaContentType(filepath);
  const [hash, stats] = await Promise.all([hashFile(filepath), stat(filepath)]);

  debug(`Registering media ${filepath} (${stats.size} bytes)`);

  const createResponse = await apiClient.POST("/media", {
    body: {
      name: basename(filepath),
      contentType,
      size: stats.size,
      hash,
      slug,
      visibility: params.visibility ?? null,
      retentionDays: params.retentionDays ?? null,
      project: params.project ?? null,
      prNumber: params.prNumber ?? null,
      comment: params.comment ?? null,
    },
  });

  if (createResponse.error) {
    throwAPIError(createResponse.error, createResponse.response);
  }

  const { media, upload } = createResponse.data;

  // No upload target means Argos already holds these exact bytes — the key is
  // content-addressed — so the media is ready and there is nothing to transfer.
  if (!upload) {
    debug(`Media already uploaded: ${media.url}`);
    return media;
  }

  debug(`Uploading ${filepath}`);
  await uploadFileWithPresignedPost({
    url: upload.url,
    fields: upload.fields,
    path: filepath,
    contentType,
  });

  const finalizeResponse = await apiClient.POST("/media/{mediaId}/finalize", {
    params: { path: { mediaId: media.id } },
  });

  if (finalizeResponse.error) {
    throwAPIError(finalizeResponse.error, finalizeResponse.response);
  }

  debug(`Media uploaded: ${finalizeResponse.data.url}`);
  return finalizeResponse.data;
}

/**
 * Determine a file's content type, and refuse anything Argos does not accept
 * before spending a hash or a request on it.
 */
function getMediaContentType(filepath: string): string {
  const extension = filepath.slice(filepath.lastIndexOf(".")).toLowerCase();
  const contentType =
    CONTENT_TYPE_BY_EXTENSION[extension] || mime.lookup(filepath);

  if (!contentType) {
    throw new Error(`Unable to determine the file type of: ${filepath}`);
  }

  if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
    throw new Error(
      `Unsupported file type "${contentType}" for ${filepath}. ` +
        `Argos accepts ${[...SUPPORTED_CONTENT_TYPES].join(", ")}.`,
    );
  }

  return contentType;
}

/**
 * A slug identifies one media, so several files cannot share one. Suffixing by
 * index keeps each of them stable across re-runs, which is what the slug is for.
 */
function resolveSlug(
  params: UploadMediaParameters,
  index: number,
): string | null {
  if (!params.slug) {
    return null;
  }
  return params.files.length > 1 ? `${params.slug}-${index + 1}` : params.slug;
}
