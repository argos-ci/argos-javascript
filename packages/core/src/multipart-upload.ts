import { open } from "node:fs/promises";
import pRetry from "p-retry";
import type { ArgosAPISchema } from "@snapvisor/api-client";
import { debug } from "./debug";
import { createUploadError } from "./s3";

type UploadedPart =
  ArgosAPISchema.components["schemas"]["UploadedMultipartPart"];

/**
 * Where to upload a large media in parts, as `createMedia` returns it in
 * `upload.multipart`.
 */
export type MultipartUploadTarget = NonNullable<
  ArgosAPISchema.components["schemas"]["MediaUploadTarget"]["multipart"]
>;

interface MultipartUploadInput {
  /** `upload.multipart` from `createMedia`. */
  target: MultipartUploadTarget;
  /** `upload.fields` from `createMedia`: its `policy` opens the upload. */
  fields: Record<string, string>;
  path: string;
  /** Size of the file, as declared to `createMedia`. */
  size: number;
  contentType: string;
  /** How many times a failed part is retried. */
  partRetries?: number;
  /** Delay before the first retry of a part, in milliseconds. */
  retryMinTimeout?: number;
}

/** Start and complete answer fast: they only talk to the bucket. */
const REQUEST_TIMEOUT = 30_000;

/**
 * One part is up to 32 MiB: at 1 MB/s that is half a minute, so a slow uplink
 * gets ample room before a part is abandoned and retried.
 */
const PART_TIMEOUT = 5 * 60_000;

/**
 * A request the server refused. Only a server error, a timeout or a rate limit
 * is worth sending again: any other 4xx (expired session, wrong size) fails the
 * same way every time.
 */
class UploadRequestError extends Error {
  retryable: boolean;

  constructor(error: Error, status: number) {
    super(error.message);
    this.name = "UploadRequestError";
    this.retryable = status >= 500 || status === 408 || status === 429;
  }
}

async function send(
  url: string,
  init: RequestInit & { timeout: number },
): Promise<Response> {
  const { timeout, ...rest } = init;
  const response = await fetch(url, {
    ...rest,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    throw new UploadRequestError(
      await createUploadError(url, response),
      response.status,
    );
  }
  return response;
}

/**
 * Upload a file in parts through the server's multipart relay, for a file too
 * large for a single request.
 *
 * The edge in front of the API refuses any request body over 100 MB, so the
 * single `POST` of `upload.url` cannot carry a larger file. Here the file is
 * sent as `partSize` slices, each read from disk only when it is sent, so at
 * most one part is ever held in memory:
 *
 * 1. `POST {target.url}` with the policy and the size opens a session;
 * 2. `PUT {target.url}/parts/{n}` sends each part, retried on its own when it
 *    fails for a reason worth retrying;
 * 3. `POST {target.url}/complete` assembles them.
 *
 * Any failure after the session is open aborts it (`POST {target.url}/abort`),
 * so the parts already stored do not linger in the bucket, and is rethrown.
 */
export async function uploadFileInParts(
  input: MultipartUploadInput,
): Promise<void> {
  const baseUrl = input.target.url.replace(/\/+$/, "");

  const startResponse = await send(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "Content-Type": input.fields["Content-Type"] ?? input.contentType,
      policy: input.fields["policy"],
      size: input.size,
    }),
    timeout: REQUEST_TIMEOUT,
  });
  const { session, partSize, partCount } = (await startResponse.json()) as {
    session: string;
    partSize: number;
    partCount: number;
  };

  debug(
    `Multipart upload started: ${partCount} parts of ${partSize} bytes for ${input.path}`,
  );

  try {
    const parts = await uploadParts({
      ...input,
      baseUrl,
      session,
      partSize,
      partCount,
    });

    await send(`${baseUrl}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, parts }),
      timeout: REQUEST_TIMEOUT,
    });
    debug(`Multipart upload completed: ${input.path}`);
  } catch (error) {
    await abortUpload(baseUrl, session);
    throw error;
  }
}

async function uploadParts(args: {
  baseUrl: string;
  session: string;
  path: string;
  size: number;
  partSize: number;
  partCount: number;
  partRetries?: number;
  retryMinTimeout?: number;
}): Promise<UploadedPart[]> {
  const file = await open(args.path, "r");
  try {
    const parts: UploadedPart[] = [];
    // Sequential: the parts share one uplink, so sending them side by side
    // would not make the file arrive sooner, only hold more of it in memory.
    for (let partNumber = 1; partNumber <= args.partCount; partNumber++) {
      const offset = (partNumber - 1) * args.partSize;
      const length = Math.min(args.partSize, args.size - offset);
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, offset);
      if (bytesRead !== length) {
        throw new Error(
          `Could not read part ${partNumber} of ${args.path}: expected ${length} bytes, read ${bytesRead}. Did the file change during the upload?`,
        );
      }

      const url = `${args.baseUrl}/parts/${partNumber}`;
      const part = await pRetry(
        async () => {
          const response = await send(url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/octet-stream",
              "x-upload-session": args.session,
            },
            // A view of the part, not a copy: retries resend the same bytes.
            body: new Uint8Array(
              buffer.buffer,
              buffer.byteOffset,
              buffer.byteLength,
            ),
            timeout: PART_TIMEOUT,
          });
          return (await response.json()) as UploadedPart;
        },
        {
          retries: args.partRetries ?? 3,
          minTimeout: args.retryMinTimeout ?? 1_000,
          shouldRetry: ({ error }) => checkIsRetryable(error),
          onFailedAttempt: ({ error, retriesLeft, retryDelay }) => {
            if (checkIsRetryable(error) && retriesLeft > 0) {
              debug(
                `Part ${partNumber} failed (${error.message}), retrying in ${retryDelay}ms (${retriesLeft} left)`,
              );
            }
          },
        },
      );
      parts.push(part);
      debug(`Uploaded part ${partNumber}/${args.partCount} (${length} bytes)`);
    }
    return parts;
  } finally {
    await file.close();
  }
}

/**
 * A refused request is retried only when the status says so; anything else
 * thrown by `fetch` is the network (reset connection, DNS, timeout), which is
 * what retrying is for.
 */
function checkIsRetryable(error: Error): boolean {
  if (error instanceof UploadRequestError) {
    return error.retryable;
  }
  return true;
}

/**
 * Discard the parts of a failed upload. Best effort: the upload has already
 * failed, and the server also aborts unfinished uploads on its own a day later,
 * so a failed abort is logged rather than hiding the error that caused it.
 */
async function abortUpload(baseUrl: string, session: string): Promise<void> {
  try {
    await send(`${baseUrl}/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
      timeout: REQUEST_TIMEOUT,
    });
    debug("Multipart upload aborted");
  } catch (error) {
    debug("Could not abort the multipart upload", error);
  }
}
