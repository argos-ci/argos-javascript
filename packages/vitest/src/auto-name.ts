/** Minimal shape of a Vitest test task that we rely on. */
type CurrentTest = { fullName: string } | undefined;

/**
 * Per-test counter used to generate unique automatic names, keyed by the
 * current test task. A `WeakMap` lets the entries be garbage-collected with the
 * test tasks, so nothing leaks across files or runs.
 */
const counters = new WeakMap<object, number>();

/**
 * Get the current Vitest test task.
 *
 * Vitest >= 4.1 exposes `TestRunner.getCurrentTest()` from the `vitest` entry
 * point; the `vitest/suite` export is deprecated. We prefer the new API and
 * fall back to `vitest/suite` for older 4.x. Both are imported dynamically so
 * importing `@argos-ci/vitest` in a non-Vitest environment does not pull Vitest
 * in.
 */
async function getCurrentTest(): Promise<CurrentTest> {
  const vitest = (await import("vitest")) as {
    TestRunner?: { getCurrentTest?: () => CurrentTest };
  };
  const runner = vitest.TestRunner;
  if (runner?.getCurrentTest) {
    return runner.getCurrentTest();
  }
  const suite = (await import("vitest/suite")) as {
    getCurrentTest: () => CurrentTest;
  };
  return suite.getCurrentTest();
}

/**
 * Resolve the name of a screenshot or snapshot.
 *
 * When an explicit `name` is provided, it is returned as-is. Otherwise a name
 * is generated automatically from the current Vitest test, mimicking
 * {@link https://vitest.dev/guide/snapshot Vitest's own snapshot naming}:
 * `` `${test.fullName} ${count}` ``, where `count` increments per test so
 * several auto-named captures in the same test stay unique.
 *
 * Must only be called once we know we are running inside Vitest (the caller
 * checks `checkIsVitestEnv` first).
 *
 * @param name - Explicit name, or `undefined`/empty to auto-generate one.
 * @returns The resolved, non-empty name.
 */
export async function resolveAutoName(name?: string): Promise<string> {
  if (name) {
    return name;
  }

  const test = await getCurrentTest();
  if (!test) {
    throw new Error(
      "Argos could not generate an automatic name because it is not running " +
        "inside a Vitest test. Pass an explicit `name` argument.",
    );
  }

  const count = (counters.get(test) ?? 0) + 1;
  counters.set(test, count);
  return `${test.fullName} ${count}`;
}
