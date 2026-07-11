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
  fullName: string;
  file: { name: string; filepath: string };
  /** Tags declared on the test (Vitest >= 4). */
  tags?: string[] | undefined;
  /** Configured maximum number of retries. */
  retry?: number | undefined;
  /** Configured number of repeats. */
  repeats?: number | undefined;
  /** Source location, only present when `includeTaskLocation` is enabled. */
  location?: { line: number; column: number } | undefined;
  annotations?:
    | Array<{
        type: string;
        message?: string;
        location?:
          | { file?: string; line?: number; column?: number }
          | undefined;
      }>
    | undefined;
  result?: { retryCount?: number; repeatCount?: number } | undefined;
}

/**
 * Get the current Vitest test task, or `undefined` when not inside a test.
 *
 * Vitest >= 4.1 exposes `TestRunner.getCurrentTest()` from the `vitest` entry
 * point; the `vitest/suite` export is deprecated. We prefer the new API and
 * fall back to `vitest/suite` for older 4.x. Both are imported dynamically so
 * importing `@argos-ci/vitest` in a non-Vitest environment does not pull Vitest
 * in — only call this once you know Vitest is available.
 */
export async function getCurrentTest(): Promise<CurrentTask | undefined> {
  const vitest = (await import("vitest")) as {
    TestRunner?: { getCurrentTest?: () => CurrentTask | undefined };
  };
  const runner = vitest.TestRunner;
  if (runner?.getCurrentTest) {
    return runner.getCurrentTest();
  }
  const suite = (await import("vitest/suite")) as {
    getCurrentTest: () => CurrentTask | undefined;
  };
  return suite.getCurrentTest();
}
