import { readFile } from "node:fs/promises";
import { basename } from "node:path";

interface UploadInput {
  url: string;
  path: string;
  contentType: string;
}

interface PresignedPostUploadInput extends UploadInput {
  fields: Record<string, string>;
}

/**
 * On failure, S3 responds with an XML body describing the error, e.g.:
 *
 *   <?xml version="1.0" encoding="UTF-8"?>
 *   <Error>
 *     <Code>AccessDenied</Code>
 *     <Message>Request has expired</Message>
 *     ...
 *   </Error>
 *
 * Extract the `Code` and `Message` so the user gets the actual reason for the
 * failure instead of a generic HTTP status. Returns `null` when the body
 * cannot be read or does not look like an S3 error document.
 */
async function readS3ErrorMessage(response: Response): Promise<string | null> {
  try {
    const body = await response.text();
    const code = body.match(/<Code>(.*?)<\/Code>/)?.[1];
    const message = body.match(/<Message>(.*?)<\/Message>/)?.[1];
    if (code && message) {
      return `${code}: ${message}`;
    }
    return message ?? code ?? null;
  } catch {
    return null;
  }
}

/**
 * Build an error for a failed upload, including the S3 error details when
 * available so the user can understand why the upload was rejected.
 */
async function createUploadError(
  url: string,
  response: Response,
): Promise<Error> {
  const detail = await readS3ErrorMessage(response);
  const status = `${response.status} ${response.statusText}`;
  return new Error(
    `Failed to upload file to ${url}: ${status}${detail ? ` — ${detail}` : ""}`,
  );
}

/**
 * Upload a file to S3 using a presigned PUT URL.
 */
export async function uploadFile(input: UploadInput): Promise<void> {
  const file = await readFile(input.path);
  const response = await fetch(input.url, {
    method: "PUT",
    headers: {
      "Content-Type": input.contentType,
    },
    signal: AbortSignal.timeout(30_000),
    body: new Uint8Array(file),
  });
  if (!response.ok) {
    throw await createUploadError(input.url, response);
  }
}

/**
 * Upload a file to S3 using a presigned POST. Unlike a presigned PUT, this
 * sends the file as multipart form data alongside the policy `fields`
 * provided by S3.
 */
export async function uploadFileWithPresignedPost(
  input: PresignedPostUploadInput,
): Promise<void> {
  const file = await readFile(input.path);
  const formData = new FormData();
  // The presigned policy fields (key, policy, signature, etc.) must be
  // appended before the file part for S3 to accept the upload.
  for (const [key, value] of Object.entries(input.fields)) {
    formData.append(key, value);
  }
  formData.append(
    "file",
    new Blob([new Uint8Array(file)], { type: input.contentType }),
    basename(input.path),
  );

  const response = await fetch(input.url, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    body: formData,
  });
  if (!response.ok) {
    throw await createUploadError(input.url, response);
  }
}
