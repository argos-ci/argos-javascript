import type { ArgosAttachment } from "@argos-ci/playwright";
import type {
  SerializableSnapshotOptions,
  VitestScreenshotOptions,
  VitestSnapshotOptions,
} from "./options";
import { serializeSnapshot } from "./serialize";

export type { VitestScreenshotOptions, VitestSnapshotOptions };

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
 * @example
 * ```ts
 * import { render } from "vitest-browser-react";
 * import { argosScreenshot } from "@argos-ci/vitest";
 *
 * test("Button", async () => {
 *   render(<Button>Click me</Button>);
 *   await argosScreenshot("button");
 * });
 * ```
 *
 * @param name - Unique name of the screenshot.
 * @param options - Serializable screenshot options.
 * @returns The attachments captured, or an empty array outside of Vitest.
 */
export async function argosScreenshot(
  name: string,
  options?: VitestScreenshotOptions,
): Promise<ArgosAttachment[]> {
  // Only run in Vitest.
  const isVitest = await checkIsVitestEnv();
  if (!isVitest) {
    return [];
  }

  // Load vitest/browser using dynamic import to avoid loading it in non-Vitest
  // environments.
  const { server } = await import("vitest/browser");
  return server.commands.argosScreenshot(name, options);
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
 * @example
 * ```ts
 * import { argosSnapshot } from "@argos-ci/vitest";
 *
 * test("API response", async () => {
 *   const data = await fetchUser();
 *   await argosSnapshot("user", data);
 * });
 * ```
 *
 * @param name - Unique name of the snapshot.
 * @param content - The value to snapshot. Strings are written as-is; any other
 *   value is serialized.
 * @param options - Snapshot options.
 * @returns The attachments written, or an empty array outside of Vitest.
 */
export async function argosSnapshot(
  name: string,
  content: unknown,
  options: VitestSnapshotOptions = {},
): Promise<ArgosAttachment[]> {
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  // Only run in Vitest.
  const isVitest = await checkIsVitestEnv();
  if (!isVitest) {
    return [];
  }

  // Serialize on the test side (browser or Node), so values that only exist
  // here (DOM nodes, class instances, …) are serialized before crossing the RPC
  // boundary.
  const serialized = serializeSnapshot(content, options);

  // The `serialize` function cannot cross the browser/node RPC boundary and is
  // no longer needed once the value is serialized.
  const { serialize: _serialize, ...serializableOptions } = options;

  if (checkIsBrowserEnv()) {
    // Load vitest/browser using dynamic import to avoid loading it in non-Vitest
    // environments.
    const { server } = await import("vitest/browser");
    return server.commands.argosSnapshot(name, serialized, serializableOptions);
  }

  // Node: write directly to disk.
  const { writeSnapshotFile } = await import("./snapshot-file");
  return writeSnapshotFile(name, serialized, serializableOptions);
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
