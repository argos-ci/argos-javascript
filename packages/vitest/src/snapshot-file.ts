import { writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { getSnapshotMimeType } from "@argos-ci/core";
import {
  createDirectory,
  getGitRepositoryPath,
  getMetadataPath,
  getScreenshotName,
  writeMetadata,
  type ScreenshotMetadata,
} from "@argos-ci/util";
import type { ArgosAttachment } from "@argos-ci/playwright";
import type { TestMetadata } from "./metadata";
import type { SerializableSnapshotOptions } from "./options";
import { getArgosVitestVersion, getVitestVersion } from "./version";

/**
 * Resolve a `test` metadata's `location.file` relative to the git repository,
 * matching the Playwright SDK. The test side reports an absolute path.
 */
async function resolveTestLocation(test: TestMetadata): Promise<TestMetadata> {
  if (!test?.location) {
    return test;
  }
  const repositoryPath = await getGitRepositoryPath();
  if (!repositoryPath) {
    return test;
  }
  return {
    ...test,
    location: {
      ...test.location,
      file: relative(repositoryPath, test.location.file),
    },
  };
}

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
  test?: TestMetadata,
): Promise<ArgosAttachment[]> {
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const root = options.root ?? DEFAULT_SNAPSHOTS_ROOT;
  const extension = normalizeExtension(options.extension ?? DEFAULT_EXTENSION);
  const filename = `${getScreenshotName(name)}${SNAPSHOT_INFIX}${extension}`;
  const snapshotPath = resolve(root, filename);

  const [vitestVersion, sdkVersion, resolvedTest] = await Promise.all([
    getVitestVersion(),
    getArgosVitestVersion(),
    resolveTestLocation(test),
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
    ...(resolvedTest ? { test: resolvedTest } : {}),
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
