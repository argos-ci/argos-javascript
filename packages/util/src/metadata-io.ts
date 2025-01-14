import { readFile, writeFile } from "node:fs/promises";
import { getMetadataPath } from "./metadata";
import type { ScreenshotMetadata } from "./metadata";

/**
 * Write screenshot metadata to disk.
 */
export async function writeMetadata(
  screenshotPath: string,
  metadata: ScreenshotMetadata,
) {
  await writeFile(getMetadataPath(screenshotPath), JSON.stringify(metadata));
}

/**
 * Read screenshot metadata from disk.
 * If not found, returns null.
 */
export async function readMetadata(
  screenshotPath: string,
): Promise<ScreenshotMetadata | null> {
  try {
    const metadata = await readFile(getMetadataPath(screenshotPath), "utf8");
    return JSON.parse(metadata);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw new Error("Failed to read metadata", { cause: error });
  }
}
