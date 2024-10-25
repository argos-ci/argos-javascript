import { TestContext, waitForPageReady } from "@storybook/test-runner";
import {
  argosScreenshot as argosPlaywrightScreenshot,
  DO_NOT_USE_setMetadataConfig,
} from "@argos-ci/playwright";
import type { ArgosScreenshotOptions as ArgosPlaywrightScreenshotOptions } from "@argos-ci/playwright";
import { join } from "node:path";
import { Page } from "playwright";
import { getArgosStorybookVersion } from "./metadata";

export type ArgosScreenshotOptions = {
  /**
   * Fit the screenshot to the content size.
   * @default true
   */
  fitToContent?:
    | boolean
    | {
        /**
         * Padding around the content in pixels.
         * @default 16
         */
        padding?: number;

        /**
         * Zoom level.
         * @default 2
         */
        zoom?: number;
      };
} & ArgosPlaywrightScreenshotOptions;

/**
 * Stabilize the UI and takes a screenshot of the application under test.
 *
 * @example
 *    argosScreenshot(page, "my-screenshot")
 * @see https://argos-ci.com/docs/playwright#api-overview
 */
export async function argosScreenshot(
  /**
   * Playwright `page` object.
   */
  page: Page,
  /**
   * Context of the test.
   */
  context: TestContext,
  /**
   * Options for the screenshot.
   */
  options?: ArgosScreenshotOptions,
) {
  const { fitToContent = true, ...screenshotOptions } = options ?? {};
  await waitForPageReady(page);

  const fitToContentOptions = (() => {
    if (options?.element || !fitToContent) {
      return {};
    }
    const { padding = 16, zoom = 2 } =
      fitToContent === true ? {} : fitToContent;
    return {
      element: "#storybook-root",
      argosCSS:
        `#storybook-root { padding: ${padding}px; width: fit-content; height: fit-content; zoom: ${zoom}; }` +
        (options?.argosCSS ?? ""),
    };
  })();

  const version = await getArgosStorybookVersion();

  await DO_NOT_USE_setMetadataConfig({
    sdk: { name: "@argos-ci/storybook", version },
    playwrightLibraries: [
      "@storybook/test-runner",
      "playwright",
      "playwright-core",
    ],
  });

  await argosPlaywrightScreenshot(page, join(context.title, context.name), {
    ...screenshotOptions,
    ...fitToContentOptions,
  });
}
