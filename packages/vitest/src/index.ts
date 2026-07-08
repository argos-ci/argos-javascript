import type { ArgosAttachment } from "@argos-ci/playwright";
import type { VitestScreenshotOptions } from "./options";

export type { VitestScreenshotOptions };

declare module "vitest/browser" {
  interface BrowserCommands {
    argosScreenshot: (
      name: string,
      options?: VitestScreenshotOptions,
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
