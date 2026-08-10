/**
 * Capture order.
 *
 * A test walks a journey and screenshots it step by step, but nothing of that
 * sequence survives the upload: the CLI discovers snapshot files by globbing a
 * directory, which yields them alphabetically. Numbering each screenshot as it
 * is taken is what lets Argos replay the journey in the order it happened.
 *
 * Counters are scoped to a test run rather than to a test, so a retry starts
 * over at 0 instead of continuing the previous attempt's numbering.
 */
const counters = new Map<string, number>();

/**
 * Return the next 0-based capture index for `testRunKey` and advance it.
 */
export function nextCaptureIndex(testRunKey: string): number {
  const index = counters.get(testRunKey) ?? 0;
  counters.set(testRunKey, index + 1);
  return index;
}

/**
 * Forget the counter of a test run. Called when a test ends, so a long worker
 * process doesn't keep one entry per test it has run.
 */
export function clearCaptureIndex(testRunKey: string): void {
  counters.delete(testRunKey);
}

/** Drop every counter. Exposed for tests. */
export function resetCaptureIndexes(): void {
  counters.clear();
}

/**
 * Build the key identifying a single run of a test. The retry and repeat
 * counters are part of it so each attempt numbers its screenshots from 0.
 */
export function getTestRunKey(test: {
  id?: string | null;
  titlePath?: string[];
  retry?: number | null;
  repeat?: number | null;
}): string {
  const identity = test.id ?? test.titlePath?.join(" › ") ?? "";
  return `${identity}#${test.retry ?? 0}@${test.repeat ?? 0}`;
}
