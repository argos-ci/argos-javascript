/**
 * Minimal structural view of a Vitest suite task (a `describe` block or the
 * file task at the root of the chain).
 */
export interface CurrentSuite {
  name?: string;
  suite?: CurrentSuite;
}

/**
 * Minimal structural view of the Vitest test task we read metadata from. Only
 * the fields Argos uses are declared; the real object has many more.
 */
export interface CurrentTask extends CurrentSuite {
  id: string;
  name: string;
  /** Path of the file, describe blocks and title (Vitest >= 4.0.14). */
  fullName?: string | undefined;
  file: { name: string; filepath: string };
  /** Tags declared on the test (Vitest >= 4). */
  tags?: string[] | undefined;
  /**
   * Configured maximum number of retries, or an object holding it in `count`
   * (Vitest >= 4.1, which also allows `delay` and `condition` there).
   */
  retry?: number | { count?: number } | undefined;
  /** Configured number of repeats. */
  repeats?: number | undefined;
  /** Source location, only present when `includeTaskLocation` is enabled. */
  location?: { line: number; column: number } | undefined;
  annotations?:
    | Array<{
        type: string;
        message?: string;
        location?:
          { file?: string; line?: number; column?: number } | undefined;
      }>
    | undefined;
  result?: { retryCount?: number; repeatCount?: number } | undefined;
  /** Custom metadata of the task, shared by every hook of the test. */
  meta?: Record<string, unknown> | undefined;
  /** The context the test function receives. */
  context?: Record<string, unknown> | undefined;
}

/**
 * Global where Vitest keeps the state of the worker running the tests, in Node
 * and in the browser alike. Vitest internal: only read on 4.0, a release line
 * that no longer changes.
 */
const WORKER_STATE_GLOBAL = "__vitest_worker__";

/**
 * Get the running test from Vitest's worker state, for Vitest 4.0.
 *
 * Vitest 4.0 exports `getCurrentTest()` only from `vitest/suite`, which this
 * package cannot import: written inline, the specifier fails Vite's dependency
 * optimizer on Vitest 5, where that export is gone; hidden from Vite, it
 * reaches the browser unresolved. The test runner also keeps the running task
 * on the worker state, and Vitest 4.0's own browser commands
 * (`page.screenshot()`) read it from there. The task is the test while it runs,
 * hooks included, and its suite or file otherwise.
 */
function getCurrentTestFromWorkerState(): CurrentTask | undefined {
  const state = (globalThis as Record<string, unknown>)[WORKER_STATE_GLOBAL] as
    { current?: CurrentTask & { type?: string } } | undefined;
  const task = state?.current;
  return task?.type === "test" ? task : undefined;
}

/**
 * Load Vitest's synchronous accessor to the current test task, for code that
 * cannot await, like a Storybook decorator.
 *
 * Vitest >= 4.1 exposes `TestRunner.getCurrentTest()` from the `vitest` entry
 * point; on Vitest 4.0, we read the worker state instead (see
 * {@link getCurrentTestFromWorkerState}). `vitest` is imported dynamically so
 * importing `@argos-ci/vitest` in a non-Vitest environment does not pull Vitest
 * in — only call this once you know Vitest is available.
 */
export async function loadGetCurrentTest(): Promise<
  () => CurrentTask | undefined
> {
  const vitest = (await import("vitest")) as {
    TestRunner?: { getCurrentTest?: () => CurrentTask | undefined };
  };
  const runner = vitest.TestRunner;
  if (runner?.getCurrentTest) {
    return () => runner.getCurrentTest!();
  }
  return getCurrentTestFromWorkerState;
}

/**
 * Get the current Vitest test task, or `undefined` when not inside a test.
 * See {@link loadGetCurrentTest} for the Vitest versions supported.
 */
export async function getCurrentTest(): Promise<CurrentTask | undefined> {
  const getCurrentTest = await loadGetCurrentTest();
  return getCurrentTest();
}
