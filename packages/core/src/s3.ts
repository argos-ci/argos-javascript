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
    throw new Error(
      `Failed to upload file to ${input.url}: ${response.status} ${response.statusText}`,
    );
  }
}

export async function uploadFileWithPresignedPost(
  input: PresignedPostUploadInput,
): Promise<void> {
  const file = await readFile(input.path);
  const formData = new FormData();
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
    throw new Error(
      `Failed to upload file to ${input.url}: ${response.status} ${response.statusText}`,
    );
  }
}
