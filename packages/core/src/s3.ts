import { readFile } from "node:fs/promises";

interface UploadInput {
  url: string;
  path: string;
  contentType: string;
}

export async function uploadFile(input: UploadInput): Promise<void> {
  const file = await readFile(input.path);
  const response = await fetch(input.url, {
    method: "PUT",
    headers: {
      "Content-Type": input.contentType,
      "Content-Length": file.length.toString(),
    },
    signal: AbortSignal.timeout(30_000),
    body: new Uint8Array(file),
  });
  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }
}
