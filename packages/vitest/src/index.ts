import type { ArgosAttachment } from "@argos-ci/playwright";
import { resolveAutoName } from "./auto-name";
import type {
  SerializableSnapshotOptions,
  VitestScreenshotOptions,
  VitestSnapshotOptions,
} from "./options";
import { serializeSnapshot } from "./serialize";

export type { VitestScreenshotOptions, VitestSnapshotOptions };

/** Suffix appended to every captured file for its metadata sidecar. */
const METADATA_SUFFIX = ".argos.json";

/**
 * Characters reserved after a screenshot name when building its filename: the
 * `` ` vw-<width>` `` viewport suffix, the largest capture extension
 * (`.aria.yml`), and the metadata sidecar. Keeps auto-generated names within
 * the filesystem limit.
 */
const SCREENSHOT_NAME_RESERVED =
  " vw-99999".length + ".aria.yml".length + METADATA_SUFFIX.length;

declare module "vitest/browser" {
  interface BrowserCommands {
    argosScreenshot: (
      name: string,
      options?: VitestScreenshotOptions,
    ) => Promise<ArgosAttachment[]>;
    argosSnapshot: (
      name: string,
      content: string,
      options?: SerializableSnapshotOptions,
    ) => Promise<ArgosAttachment[]>;
  }
}

/**
 * Take an Argos screenshot in a Vitest browser test.
 *
 * Requires the {@link https://www.npmjs.com/package/@argos-ci/vitest Argos Vitest plugin}
 * to be registered in your Vitest config.
 *
 * The `name` is optional: when omitted, Argos generates one automatically from
 * the current test, mimicking {@link https://vitest.dev/guide/snapshot Vitest's
 * snapshot naming}. The name includes the test file path (Argos names are global
 * across the build, unlike Vitest's per-file `.snap`), so names stay unique
 * across files.
 *
 * @example
 * ```ts
 * import { render } from "vitest-browser-react";
 * import { argosScreenshot } from "@argos-ci/vitest";
 *
 * test("Button", async () => {
 *   render(<Button>Click me</Button>);
 *   await argosScreenshot("button"); // explicit name
 *   await argosScreenshot();         // -> "src/Button.test.tsx > Button 1"
 * });
 * ```
 *
 * @param name - Unique name of the screenshot. Omit to generate one from the
 *   current test.
 * @param options - Serializable screenshot options.
 * @returns The attachments captured, or an empty array outside of Vitest.
 */
export async function argosScreenshot(
  name: string,
  options?: VitestScreenshotOptions,
): Promise<ArgosAttachment[]>;
export async function argosScreenshot(
  options?: VitestScreenshotOptions,
): Promise<ArgosAttachment[]>;
export async function argosScreenshot(
  nameOrOptions?: string | VitestScreenshotOptions,
  maybeOptions?: VitestScreenshotOptions,
): Promise<ArgosAttachment[]> {
  const name = typeof nameOrOptions === "string" ? nameOrOptions : undefined;
  const options =
    typeof nameOrOptions === "string" ? maybeOptions : nameOrOptions;

  // Only run in Vitest.
  const isVitest = await checkIsVitestEnv();
  if (!isVitest) {
    return [];
  }

  const resolvedName = await resolveAutoName(name, {
    reservedLength: SCREENSHOT_NAME_RESERVED,
  });

  // Load vitest/browser using dynamic import to avoid loading it in non-Vitest
  // environments.
  const { server } = await import("vitest/browser");
  return server.commands.argosScreenshot(resolvedName, options);
}

/**
 * Take an Argos snapshot of any serializable value, mimicking
 * {@link https://vitest.dev/guide/snapshot Vitest snapshots}.
 *
 * Unlike {@link argosScreenshot}, this does not need a browser: it serializes
 * the value (strings verbatim, everything else via `@vitest/pretty-format`) to a
 * file that Argos picks up and diffs across builds. It works both in Vitest
 * browser tests and in plain Node tests.
 *
 * The name is optional: pass it via `options.name`, or omit it to have Argos
 * generate one automatically from the current test, mimicking
 * {@link https://vitest.dev/guide/snapshot Vitest's snapshot naming}. The name
 * includes the test file path (Argos names are global across the build, unlike
 * Vitest's per-file `.snap`), so names stay unique across files.
 *
 * @example
 * ```ts
 * import { argosSnapshot } from "@argos-ci/vitest";
 *
 * test("API response", async () => {
 *   const data = await fetchUser();
 *   await argosSnapshot(data);                   // -> "src/user.test.ts > API response 1"
 *   await argosSnapshot(data, { name: "user" }); // explicit name
 * });
 * ```
 *
 * @param content - The value to snapshot. Strings are written as-is; any other
 *   value is serialized.
 * @param options - Snapshot options, including an optional `name`.
 * @returns The attachments written, or an empty array outside of Vitest.
 */
export async function argosSnapshot(
  content: unknown,
  options: VitestSnapshotOptions = {},
): Promise<ArgosAttachment[]> {
  // Only run in Vitest.
  const isVitest = await checkIsVitestEnv();
  if (!isVitest) {
    return [];
  }

  // Reserve room for the `.snapshot<ext>` suffix and the metadata sidecar so an
  // auto-generated filename stays within the filesystem limit. Kept in sync with
  // `writeSnapshotFile` in `snapshot-file.ts`.
  const rawExtension = options.extension ?? ".txt";
  const extension = rawExtension.startsWith(".")
    ? rawExtension
    : `.${rawExtension}`;
  const resolvedName = await resolveAutoName(options.name, {
    reservedLength:
      ".snapshot".length + extension.length + METADATA_SUFFIX.length,
  });

  // Serialize on the test side (browser or Node), so values that only exist
  // here (DOM nodes, class instances, …) are serialized before crossing the RPC
  // boundary.
  const serialized = serializeSnapshot(content, options);

  // `serialize` cannot cross the browser/node RPC boundary, and `name` is passed
  // to the Node primitives as a separate argument — strip both.
  const {
    serialize: _serialize,
    name: _name,
    ...serializableOptions
  } = options;

  if (checkIsBrowserEnv()) {
    // Load vitest/browser using dynamic import to avoid loading it in non-Vitest
    // environments.
    const { server } = await import("vitest/browser");
    return server.commands.argosSnapshot(
      resolvedName,
      serialized,
      serializableOptions,
    );
  }

  // Node: write directly to disk.
  const { writeSnapshotFile } = await import("./snapshot-file");
  return writeSnapshotFile(resolvedName, serialized, serializableOptions);
}

/**
 * Check if we are running in a Vitest environment.
 */
export async function checkIsVitestEnv(): Promise<boolean> {
  try {
    await import("vitest");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if we are running in Vitest browser mode.
 * Vitest sets this global in the browser runner.
 */
export function checkIsBrowserEnv(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    (globalThis as { __vitest_browser__?: boolean }).__vitest_browser__ === true
  );
}
