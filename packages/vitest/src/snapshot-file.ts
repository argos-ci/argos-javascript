import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getSnapshotMimeType } from "@argos-ci/core";
import {
  createDirectory,
  getMetadataPath,
  getScreenshotName,
  writeMetadata,
  type ScreenshotMetadata,
} from "@argos-ci/util";
import type { ArgosAttachment } from "@argos-ci/playwright";
import type { SerializableSnapshotOptions } from "./options";
import { getArgosVitestVersion, getVitestVersion } from "./version";

/**
 * Default folder where snapshots are written when no `root` is provided.
 * Matches the plugin default so Node and browser snapshots land together.
 */
export const DEFAULT_SNAPSHOTS_ROOT = "./snapshots";

/**
 * Default extension of a serialized snapshot file.
 */
const DEFAULT_EXTENSION = ".txt";

/**
 * Marker inserted before the extension so the reporter can reliably pick up
 * snapshots (`**\/*.snapshot.*`) without matching screenshots or ARIA files.
 */
const SNAPSHOT_INFIX = ".snapshot";

/**
 * Normalize a user-provided extension to a leading-dot form (`.txt`).
 */
function normalizeExtension(extension: string): string {
  return extension.startsWith(".") ? extension : `.${extension}`;
}

/**
 * Write a serialized snapshot (and its metadata) to disk and return the
 * corresponding Argos attachments.
 *
 * This is the shared Node-side primitive used by both the browser command (which
 * receives the already-serialized string over RPC) and the Node code path.
 */
export async function writeSnapshotFile(
  name: string,
  content: string,
  options: SerializableSnapshotOptions = {},
): Promise<ArgosAttachment[]> {
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const root = options.root ?? DEFAULT_SNAPSHOTS_ROOT;
  const extension = normalizeExtension(options.extension ?? DEFAULT_EXTENSION);
  const filename = `${getScreenshotName(name)}${SNAPSHOT_INFIX}${extension}`;
  const snapshotPath = resolve(root, filename);

  const [vitestVersion, sdkVersion] = await Promise.all([
    getVitestVersion(),
    getArgosVitestVersion(),
  ]);

  const tags = options.tag
    ? Array.isArray(options.tag)
      ? options.tag
      : [options.tag]
    : undefined;

  const metadata: ScreenshotMetadata = {
    // `argosSnapshot` does not rely on a browser, so Vitest itself is the
    // automation library that produced the snapshot.
    automationLibrary: { name: "vitest", version: vitestVersion },
    sdk: { name: "@argos-ci/vitest", version: sdkVersion },
    ...(tags ? { tags } : {}),
  };

  await createDirectory(dirname(snapshotPath));
  await Promise.all([
    writeFile(snapshotPath, content, "utf-8"),
    writeMetadata(snapshotPath, metadata),
  ]);

  return [
    {
      name: `argos/snapshot___${name}`,
      contentType: getSnapshotMimeType(snapshotPath),
      path: snapshotPath,
    },
    {
      name: `argos/snapshot/metadata___${name}`,
      contentType: "application/json",
      path: getMetadataPath(snapshotPath),
    },
  ];
}
