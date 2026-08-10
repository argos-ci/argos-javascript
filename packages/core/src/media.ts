import { stat } from "node:fs/promises";
import { basename } from "node:path";
import mime from "mime-types";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { resolveArgosToken } from "./auth";
import { getConfigFromOptions } from "./config";
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

  // Every file is checked before any of them is transferred: an unsupported type,
  // a name collision or a path that cannot be read must not surface half way
  // through a batch, with the files before it already created and billed.
  const identities = params.files.map((filepath) =>
    resolveMediaIdentity(filepath, params.state),
  );
  const contentTypes = params.files.map((filepath) =>
    getMediaContentType(filepath),
  );
  assertDistinctIdentities(params.files, identities);
  await assertFilesAreReadable(params.files);

  const { authToken, apiBaseUrl, project } = await resolveAuth(params);

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
        project,
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
  project: string | null;
  identity: MediaIdentity;
  source: MediaSource;
}): Promise<Media> {
  const { apiClient, params, project, identity } = args;

  const compressed =
    params.compress === false ? null : await compressMediaToWebp(args.source);

  try {
    return await registerAndUpload({
      ...args,
      apiClient,
      params,
      project,
      identity,
      source: compressed?.source ?? args.source,
    });
  } finally {
    // The converted bytes live in a temporary file; nothing else deletes it, and
    // a batch of screenshots would otherwise leave one per file behind.
    compressed?.cleanup();
  }
}

async function registerAndUpload(args: {
  apiClient: ReturnType<typeof createClient>;
  params: UploadMediaParameters;
  project: string | null;
  identity: MediaIdentity;
  source: MediaSource;
}): Promise<Media> {
  const { apiClient, params, project, identity, source } = args;

  const [hash, stats] = await Promise.all([
    hashFile(source.path),
    stat(source.path),
  ]);

  debug(`Registering media ${identity.name} (${stats.size} bytes)`);

  const createResponse = await apiClient.POST("/media", {
    body: {
      name: identity.name,
      state: identity.state,
      // `||`, not `??`: an empty description is a caller clearing it, not setting
      // the media's prose to the empty string.
      description: params.description || null,
      contentType: source.contentType,
      size: stats.size,
      hash,
      visibility: params.visibility ?? null,
      project,
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
 * Resolve what it takes to talk to the API: the token, the API to send to, and
 * the project to upload into.
 *
 * Only the three fields the configuration layer is being asked about are handed
 * to it — never the caller's whole parameter bag. `branch` and `prNumber` mean
 * something else there (the branch and pull request of a *build*), and a media's
 * are sent to the CI tokenless exchange as the ref being authorized, so passing
 * them through would authorize an upload against whatever branch it named rather
 * than the one the job is running on.
 *
 * `requireGitContext: false` because uploading a screenshot has nothing to do
 * with a commit: without it this cannot run outside a git repository at all, which
 * is exactly where an agent holding a screenshot in a scratch directory is.
 */
async function resolveAuth(params: UploadMediaParameters): Promise<{
  authToken: string;
  apiBaseUrl: string;
  project: string | null;
}> {
  const config = await getConfigFromOptions(
    {
      token: params.token,
      apiBaseUrl: params.apiBaseUrl,
      project: params.project,
    },
    { requireGitContext: false },
  );

  return {
    authToken: await resolveArgosToken(config),
    apiBaseUrl: config.apiBaseUrl,
    project: config.project ?? null,
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
 * would be visible afterwards.
 *
 * The everyday way in takes no flags at all — `before/shot.png after/shot.png`,
 * two captures of the same screen kept in separate directories, both of which
 * upload as `shot.png` because the directory is not part of the name. An explicit
 * `state` over a hyphenated pair (`nav-before.png nav-after.png --state after`)
 * gets here too, by overwriting the label that told the two halves apart.
 */
/**
 * Refuse a batch containing a file that cannot be read.
 *
 * A typo or a glob that matched nothing has to fail here rather than when the
 * loop reaches it: by then the files before it have been created, billed and
 * finalized, there is nothing to resume, and the error a caller sees blames
 * whatever step happened to touch the path first.
 */
async function assertFilesAreReadable(files: string[]): Promise<void> {
  await Promise.all(
    files.map(async (filepath) => {
      try {
        await stat(filepath);
      } catch {
        throw new Error(`Cannot read file: ${filepath}`);
      }
    }),
  );
}

function assertDistinctIdentities(
  files: string[],
  identities: MediaIdentity[],
): void {
  const seen = new Map<string, string>();

  for (const [index, identity] of identities.entries()) {
    // The separator is written as an escape rather than typed: a literal NUL
    // byte in the source makes the whole file binary to grep and to GitHub.
    const key = `${identity.name}\u0000${identity.state ?? ""}`;
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
