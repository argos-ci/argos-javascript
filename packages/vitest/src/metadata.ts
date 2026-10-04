import {
  getTestRunKey,
  nextCaptureIndex,
  type ScreenshotMetadata,
} from "@argos-ci/util";
import { getStorybookContext, type StorybookContext } from "./storybook";
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
export function getTitlePath(task: CurrentTask): string[] {
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
 * Get the configured maximum number of retries of a task. Since Vitest 4.1 the
 * `retry` option can be an object, which the task keeps as is, while the
 * metadata expects a number: take its `count`, defaulting to 0 like Vitest.
 */
function getRetries(task: CurrentTask): number | undefined {
  if (typeof task.retry === "object") {
    return task.retry.count ?? 0;
  }
  return task.retry;
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
    retries: getRetries(task),
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
 * What a capture records about the current Vitest test, read from a single
 * lookup of the test: its `test` metadata, its position among the test's
 * captures, and the story it renders. All `null` outside a test.
 *
 * Runs on the test side (browser or Node) where the test context is available;
 * the resulting plain objects cross the browser/Node RPC boundary unchanged.
 */
export async function getCaptureMetadata(): Promise<{
  test: TestMetadata;
  captureIndex: number | null;
  storybook: StorybookContext | null;
}> {
  const task = await getCurrentTest();
  if (!task) {
    return { test: null, captureIndex: null, storybook: null };
  }
  return {
    test: buildTestMetadata(task),
    // Screenshots and snapshots share the counter, so a test that mixes both
    // still numbers them in the order it produced them.
    captureIndex: nextCaptureIndex(
      getTestRunKey({
        id: task.id,
        retry: task.result?.retryCount ?? undefined,
        repeat: task.result?.repeatCount ?? undefined,
      }),
    ),
    storybook: getStorybookContext(task),
  };
}
