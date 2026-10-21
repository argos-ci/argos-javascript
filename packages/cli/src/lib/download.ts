import { createWriteStream } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { setTimeout as sleep } from "node:timers/promises";
import ora from "ora";

import type { Build, SnapshotDiff } from "./build";
import { fail } from "./cli-error";

/** A snapshot file to download: its name in Argos and where it is served. */
export type SnapshotFile = {
  name: string;
  url: string;
  contentType: string;
};

/** A snapshot of a build, as listed in a download's result. */
export type DownloadedSnapshot = SnapshotFile & {
  /** Status of the diff the snapshot comes from. */
  status: SnapshotDiff["status"];
  /** Absolute path the file was written to. */
  path: string;
};

/** What a download command prints: the build, and the files written. */
export type SnapshotDownload = {
  build: Build;
  directory: string;
  files: DownloadedSnapshot[];
};

/** Files downloaded at the same time. */
const CONCURRENCY = 8;

/** Attempts per file before giving up, for failures that may not last. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;

/** Extension given to a file of each content type when its name has none. */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// Characters Windows refuses in a file name.
// eslint-disable-next-line no-control-regex
const WINDOWS_RESERVED_CHARACTERS = /[<>:"|?*\u0000-\u001f]/g;

/**
 * Get the path, relative to the download directory, a snapshot is written to.
 *
 * A snapshot is named after the path it was uploaded from
 * (`chromium/home.png`), so the directory mirrors the original layout. Names
 * are whatever the uploader sent, so the `.` and `..` segments and leading
 * slashes are dropped: every file stays inside the directory.
 */
export function getSnapshotPath(
  file: Pick<SnapshotFile, "name" | "contentType">,
  platform: NodeJS.Platform = process.platform,
): string {
  const segments = file.name
    .split(/[\\/]/)
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..")
    .map((segment) =>
      platform === "win32"
        ? segment.replace(WINDOWS_RESERVED_CHARACTERS, "_")
        : segment,
    );
  const basename = segments.pop() ?? "snapshot";
  // A name that ends with an image extension is kept as is, even when it is
  // not the file's: `argos upload` stores a JPEG as a PNG under its `.jpg`
  // name, and keeping that name lets the directory be uploaded again as the
  // same snapshots. Other names (`Button.Primary`, or the story names the
  // Storybook SDK sends) get the extension of the file's type.
  const extension = EXTENSION_BY_CONTENT_TYPE[file.contentType];
  const suffix =
    extension && !IMAGE_EXTENSIONS.has(extname(basename).toLowerCase())
      ? extension
      : "";
  return [...segments, `${basename}${suffix}`].join("/");
}

/**
 * Get a distinct path for each snapshot. Two names can map to the same file:
 * `home` and `home.png` once the extension is added, or `Home.png` and
 * `home.png`, which macOS and Windows store as one. The later ones get a
 * ` (2)`, ` (3)`… before their extension instead of overwriting the first, on
 * every platform, so a directory copied elsewhere keeps all its files.
 */
export function getSnapshotPaths(
  files: Pick<SnapshotFile, "name" | "contentType">[],
  platform: NodeJS.Platform = process.platform,
): string[] {
  const used = new Set<string>();
  return files.map((file) => {
    const path = getSnapshotPath(file, platform);
    const extension = extname(path);
    const stem = path.slice(0, path.length - extension.length);
    let candidate = path;
    for (let index = 2; used.has(candidate.toLowerCase()); index++) {
      candidate = `${stem} (${index})${extension}`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Abort unless `directory` is missing or empty. Downloading into a directory
 * that already holds files would overwrite some of them and leave others
 * around, so the result would no longer match the build.
 */
export async function assertEmptyDirectory(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return;
    }
    if (isErrnoException(error) && error.code === "ENOTDIR") {
      fail(`${directory} is not a directory.`);
    }
    throw error;
  }
  if (entries.length > 0) {
    fail(
      `${directory} is not empty. Pick a new directory with --output, or empty it first.`,
    );
  }
}

/** A failed response, and whether trying again may succeed. */
class HTTPStatusError extends Error {
  retryable: boolean;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.retryable = status === 429 || status >= 500;
  }
}

async function downloadFile(
  file: SnapshotFile,
  path: string,
  signal: AbortSignal,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(file.url, { signal });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new HTTPStatusError(response.status);
      }
      await pipeline(
        Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
        createWriteStream(path),
        { signal },
      );
      return;
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      // Anything but an HTTP status is a network failure, worth another try.
      const retryable = !(error instanceof HTTPStatusError) || error.retryable;
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        const reason = error instanceof Error ? error.message : String(error);
        fail(`Could not download "${file.name}" (${reason}): ${file.url}`);
      }
      await sleep(RETRY_DELAY_MS * attempt, undefined, { signal });
    }
  }
}

/**
 * Download snapshot files into `directory`, a few at a time, each to the path
 * {@link getSnapshotPaths} gives it. The first file that cannot be downloaded
 * cancels the others, and its error is thrown once they have all stopped.
 */
export async function downloadSnapshots<T extends SnapshotFile>(
  files: T[],
  directory: string,
  options: { onProgress?: (done: number, total: number) => void } = {},
): Promise<(T & { path: string })[]> {
  const paths = getSnapshotPaths(files);
  const entries = files.map((file, index) => ({
    ...file,
    path: join(directory, paths[index]!),
  }));

  const controller = new AbortController();
  // Typed by assertion: it is set inside `work`, which narrowing cannot see.
  let failure = null as { error: unknown } | null;
  let next = 0;
  let done = 0;
  const work = async () => {
    try {
      while (!controller.signal.aborted && next < entries.length) {
        const entry = entries[next++]!;
        await mkdir(dirname(entry.path), { recursive: true });
        await downloadFile(entry, entry.path, controller.signal);
        options.onProgress?.(++done, entries.length);
      }
    } catch (error) {
      // Only the first failure counts: the others are the downloads it
      // cancelled.
      if (!failure) {
        failure = { error };
        controller.abort();
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, entries.length) }, work),
  );
  if (failure) {
    throw failure.error;
  }
  return entries;
}

/**
 * Download the snapshot each diff captured (its head; a removed diff has none)
 * into `directory`, showing progress unless the output is JSON.
 */
export async function downloadBuildSnapshots(args: {
  build: Build;
  diffs: SnapshotDiff[];
  directory: string;
  json: boolean | undefined;
}): Promise<SnapshotDownload> {
  const snapshots = args.diffs.flatMap((diff) =>
    diff.head
      ? [
          {
            name: diff.head.name,
            url: diff.head.url,
            contentType: diff.head.contentType,
            status: diff.status,
          },
        ]
      : [],
  );
  // The spinner would interleave with JSON on stdout and break any parser
  // reading it.
  const spinner =
    args.json || snapshots.length === 0
      ? null
      : ora(`Downloading ${snapshots.length} snapshots`).start();
  try {
    const files = await downloadSnapshots(snapshots, args.directory, {
      onProgress: (done, total) => {
        if (spinner) {
          spinner.text = `Downloading snapshots (${done}/${total})`;
        }
      },
    });
    return { build: args.build, directory: args.directory, files };
  } finally {
    spinner?.stop();
  }
}
