import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const createDirectoryPromises = new Map<string, Promise<void>>();

/**
 * Create a directory if it doesn't exist.
 */
export async function createDirectory(pathname: string) {
  let promise = createDirectoryPromises.get(pathname);
  if (promise) {
    return promise;
  }

  promise = mkdir(pathname, { recursive: true }).then(() => {});
  createDirectoryPromises.set(pathname, promise);
  return promise;
}

/**
 * Create temporary directory.
 */
export async function createTemporaryDirectory() {
  const osTmpDirectory = tmpdir();
  const path = join(osTmpDirectory, "argos." + randomBytes(16).toString("hex"));
  await createDirectory(path);
  return path;
}
