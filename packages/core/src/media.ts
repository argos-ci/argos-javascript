import { stat } from "node:fs/promises";
import { basename } from "node:path";
import mime from "mime-types";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { resolveArgosToken } from "./auth";
import { DEFAULT_API_BASE_URL, getConfigFromOptions } from "./config";
import { debug } from "./debug";
import { hashFile } from "./hashing";
import { compressMediaToWebp, type MediaSource } from "./media-compress";
import { uploadFileWithPresignedPost } from "./s3";

export type Media = ArgosAPISchema.components["schemas"]["Media"];

/** Which half of a before/after pair a media is. */
export type MediaState = NonNullable<Media["state"]>;

/** Who can open a media's share page. */
export type MediaVisibility = Media["visibility"];

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

/**
 * A file name ending in `-before` or `-after`, which is a caller labelling half
 * of a pair rather than naming a file. Mirrors the server's own parsing, so the
 * two halves end up sharing one name and get compared side by side.
 */
const STATE_SUFFIX_REGEX = /^(.*)-(before|after)(\.[^.]+)?$/i;

/** What a media is called, and which half of a pair it is. */
type MediaIdentity = {
  name: string;
  state: MediaState | null;
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
   * Branch the media belongs to. Use this when the pull request does not exist
   * yet: the media is staged, and Argos publishes it — and posts the pull
   * request comment — on its own once a pull request opens for that branch.
   */
  branch?: string;

  /**
   * Pull request to publish the media to. Argos keeps a single comment on it
   * listing every media uploaded, edited in place.
   */
  prNumber?: number;

  /**
   * Which half of a before/after pair these files are. Inferred from a file name
   * ending in `-before` or `-after`; pass this to override it.
   */
  state?: MediaState;

  /**
   * Prose shown under the media in the pull request comment.
   */
  description?: string;

  /**
   * Who can open the share page. `team` requires an Argos session; `public` only
   * requires the URL. Defaults to the most private option the plan allows.
   */
  visibility?: MediaVisibility;

  /**
   * Convert images to WebP before uploading, which is what makes a screenshot
   * upload fast. Set to `false` to upload the file exactly as it is.
   * @default true
   */
  compress?: boolean;
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

  // Both are pure string work, and doing them for every file first means an
  // unsupported type or a name collision fails before anything is transferred
  // rather than half way through a batch.
  const identities = params.files.map((filepath) =>
    resolveMediaIdentity(filepath, params.state),
  );
  const contentTypes = params.files.map(getMediaContentType);
  assertDistinctIdentities(params.files, identities);

  const { authToken, apiBaseUrl } = await resolveAuth(params);

  const apiClient = createClient({ baseUrl: apiBaseUrl, authToken });

  // Sequential rather than concurrent: these are large files, and saturating an
  // uplink with several 500 MB videos makes every one of them slower while making
  // the progress output useless.
  const results: Media[] = [];
  for (const [index, filepath] of params.files.entries()) {
    results.push(
      await uploadOne({
        apiClient,
        params,
        source: { path: filepath, contentType: contentTypes[index]! },
        identity: identities[index]!,
      }),
    );
  }

  return results;
}

async function uploadOne(args: {
  apiClient: ReturnType<typeof createClient>;
  params: UploadMediaParameters;
  source: MediaSource;
  identity: MediaIdentity;
}): Promise<Media> {
  const { apiClient, params, identity } = args;

  // The name stays the one the caller gave, extension included, even when the
  // bytes were converted: it is the media's identity, so letting it follow the
  // upload format would turn a re-run with compression turned off into a second
  // media instead of a second version.
  const source =
    params.compress === false
      ? args.source
      : await compressMediaToWebp(args.source);

  const [hash, stats] = await Promise.all([
    hashFile(source.path),
    stat(source.path),
  ]);

  debug(`Registering media ${identity.name} (${stats.size} bytes)`);

  const createResponse = await apiClient.POST("/media", {
    body: {
      name: identity.name,
      state: identity.state,
      description: params.description ?? null,
      contentType: source.contentType,
      size: stats.size,
      hash,
      visibility: params.visibility ?? null,
      // `ARGOS_PROJECT` is read here rather than through the build configuration,
      // which this no longer goes through when a token is already in hand.
      project: params.project || process.env["ARGOS_PROJECT"] || null,
      prNumber: params.prNumber ?? null,
      branch: params.branch ?? null,
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

  debug(`Uploading ${source.path}`);
  await uploadFileWithPresignedPost({
    url: upload.url,
    fields: upload.fields,
    path: source.path,
    contentType: source.contentType,
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
 * Resolve the token and API base URL to upload with.
 *
 * A token in hand is enough on its own, which is the point: uploading a
 * screenshot has nothing to do with a commit, and going through the build
 * configuration would refuse to run outside a git repository — exactly where an
 * agent holding a screenshot in a scratch directory is working.
 *
 * Without one, the only way left is CI tokenless authentication, which reads the
 * repository and run out of the full configuration. That path only exists inside
 * CI, where a branch and a commit are always there to be found.
 */
async function resolveAuth(params: UploadMediaParameters): Promise<{
  authToken: string;
  apiBaseUrl: string;
}> {
  const token = params.token || process.env["ARGOS_TOKEN"];

  if (token) {
    return {
      authToken: token,
      apiBaseUrl:
        params.apiBaseUrl ||
        process.env["ARGOS_API_BASE_URL"] ||
        DEFAULT_API_BASE_URL,
    };
  }

  const config = await getConfigFromOptions(params);
  return {
    authToken: await resolveArgosToken(config),
    apiBaseUrl: config.apiBaseUrl,
  };
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
 * Read a media's identity off its path.
 *
 * `checkout-before.png` is a caller saying "this is the before", not a file
 * literally called that, so the suffix is lifted off the name — which is what
 * lets the two halves of a pair share one name and be shown side by side. An
 * explicit `state` replaces the one read from the name, but the name is stripped
 * either way: `checkout-before.png` uploaded as the after is still `checkout.png`.
 */
function resolveMediaIdentity(
  filepath: string,
  state: MediaState | undefined,
): MediaIdentity {
  const fileName = basename(filepath);
  const match = STATE_SUFFIX_REGEX.exec(fileName);

  if (!match) {
    return { name: fileName, state: state ?? null };
  }

  const [, stem, suffix, extension] = match;
  // Guaranteed by the pattern, but the compiler cannot see that through a regex.
  if (stem === undefined || suffix === undefined) {
    return { name: fileName, state: state ?? null };
  }

  return {
    name: `${stem}${extension ?? ""}`,
    state: state ?? (suffix.toLowerCase() === "before" ? "before" : "after"),
  };
}

/**
 * Refuse a batch in which two files resolve to the same identity.
 *
 * Name and state are what a media is: uploading two files that agree on both
 * would silently make the second a new version of the first, and only one of them
 * would be visible afterwards. It takes an explicit `state` over a pair to get
 * here — `before.png after.png --state after` — which is a mistake worth naming
 * rather than absorbing.
 */
function assertDistinctIdentities(
  files: string[],
  identities: MediaIdentity[],
): void {
  const seen = new Map<string, string>();

  for (const [index, identity] of identities.entries()) {
    const key = `${identity.name} ${identity.state ?? ""}`;
    const previous = seen.get(key);
    const filepath = files[index]!;

    if (previous !== undefined) {
      const state = identity.state ? ` (${identity.state})` : "";
      throw new Error(
        `${previous} and ${filepath} would both upload as "${identity.name}"${state}, ` +
          `so the second would replace the first. Rename one of them, or upload them separately.`,
      );
    }

    seen.set(key, filepath);
  }
}
