import { getCurrentTest } from "./test-context";

/**
 * Maximum length of a single filename component on common filesystems (ext4,
 * APFS, NTFS all cap at 255 bytes/chars).
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * Per-test counter used to generate unique automatic names, keyed by the
 * current test task. A `WeakMap` lets the entries be garbage-collected with the
 * test tasks, so nothing leaks across files or runs.
 */
const counters = new WeakMap<object, number>();

/**
 * Truncate `text` to `length` characters, replacing the tail with an ellipsis.
 */
function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 1))}…`;
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
 * Unlike Vitest — which stores snapshots in a per-file `.snap`, so its keys only
 * need to be unique within a file — Argos names are global across the whole
 * build. The name therefore includes the test file path so two tests with the
 * same title in different files do not collide. Vitest's `fullName` already
 * starts with the file path; we prepend it defensively in case that changes.
 *
 * The name is kept short enough that the final filename — including the
 * extension(s) the caller appends (e.g. `.snapshot.txt`, ` vw-800.png`) and the
 * `.argos.json` metadata sidecar — fits within {@link MAX_FILENAME_LENGTH}.
 * Mirroring the Playwright SDK, when the readable name would overflow we fall
 * back to the test id (short and unique) so truncated names never collide, then
 * keep as much of the readable name as fits.
 *
 * Must only be called once we know we are running inside Vitest (the caller
 * checks `checkIsVitestEnv` first).
 *
 * @param name - Explicit name, or `undefined`/empty to auto-generate one.
 * @param options.reservedLength - Number of characters the caller appends after
 *   the returned name when building the filename (extensions + metadata
 *   suffix), reserved so the whole filename stays within the limit.
 * @returns The resolved, non-empty name.
 */
export async function resolveAutoName(
  name?: string,
  options: { reservedLength?: number } = {},
): Promise<string> {
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

  const file = test.file?.name;
  const fullName =
    file && !test.fullName.startsWith(file)
      ? `${file} > ${test.fullName}`
      : test.fullName;

  // Reserve room for the trailing counter and the caller's suffix, then keep
  // the whole name within the filesystem limit. The counter always survives
  // (appended after truncation) so per-test captures stay unique; when the
  // readable name overflows, the unique test id is prepended so truncated names
  // from different tests never collide.
  const suffix = ` ${count}`;
  const maxBase =
    MAX_FILENAME_LENGTH - (options.reservedLength ?? 0) - suffix.length;
  const base =
    fullName.length > maxBase
      ? truncate(`${test.id} ${fullName}`, maxBase)
      : fullName;
  return `${base}${suffix}`;
}
