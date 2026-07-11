import type { ScreenshotMetadata } from "@argos-ci/util";
import {
  getCurrentTest,
  type CurrentSuite,
  type CurrentTask,
} from "./test-context";

/** The `test` slice of {@link ScreenshotMetadata}. */
export type TestMetadata = ScreenshotMetadata["test"];

/**
 * Build the title path of a task (`[file, ...describes, title]`), replicating
 * Vitest's own `getNames` helper so it matches the framework's conventions.
 */
function getTitlePath(task: CurrentTask): string[] {
  const names = [task.name];
  let current: CurrentSuite = task;
  while (current.suite) {
    current = current.suite;
    if (current.name) {
      names.unshift(current.name);
    }
  }
  // The file task sits at the top of the suite chain; only prepend it when the
  // walk did not already reach it (mirrors Vitest's `current !== task.file`).
  if ((current as unknown) !== (task.file as unknown)) {
    names.unshift(task.file.name);
  }
  return names;
}

/**
 * Build the Argos `test` metadata from a Vitest test task, mirroring the
 * Playwright SDK.
 *
 * `location.file` is left absolute here; the Node side (the Playwright SDK for
 * screenshots, {@link writeSnapshotFile} for snapshots) resolves it relative to
 * the git repository — the same treatment the Playwright SDK applies.
 */
export function buildTestMetadata(
  task: CurrentTask,
): NonNullable<TestMetadata> {
  return {
    id: task.id,
    title: task.name,
    titlePath: getTitlePath(task),
    tags: task.tags && task.tags.length > 0 ? task.tags : undefined,
    // `retry`/`repeats` on the task are the configured maximums; the current
    // counts live on the result.
    retries: task.retry ?? undefined,
    retry: task.result?.retryCount ?? undefined,
    repeat: task.result?.repeatCount ?? task.repeats ?? undefined,
    location: {
      file: task.file.filepath,
      line: task.location?.line ?? 0,
      column: task.location?.column ?? 0,
    },
    annotations:
      task.annotations && task.annotations.length > 0
        ? task.annotations.map((annotation) => ({
            type: annotation.type,
            description: annotation.message,
            location: annotation.location
              ? {
                  file: annotation.location.file ?? task.file.filepath,
                  line: annotation.location.line ?? 0,
                  column: annotation.location.column ?? 0,
                }
              : undefined,
          }))
        : undefined,
  };
}

/**
 * Get the Argos `test` metadata for the current Vitest test, or `null` when not
 * running inside a test.
 *
 * Runs on the test side (browser or Node) where the test context is available;
 * the resulting plain object crosses the browser/Node RPC boundary unchanged.
 */
export async function getTestMetadata(): Promise<TestMetadata> {
  const task = await getCurrentTest();
  if (!task) {
    return null;
  }
  return buildTestMetadata(task);
}
