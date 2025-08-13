import type { TestContext } from "@storybook/test-runner";
import { getStoryContext, waitForPageReady } from "@storybook/test-runner";
import {
  storybookArgosScreenshot,
  type ArgosScreenshotOptions,
} from "./utils/screenshot";
import type { Page } from "playwright";
import {
  getFitToContentFromParameters,
  type FitToContent,
} from "./utils/parameters";

export type { ArgosStorybookParameters } from "./utils/parameters";
export type { ArgosScreenshotOptions };

/**
 * Stabilize the UI and takes a screenshot of the application under test.
 *
 * @example argosScreenshot(page, context, options)
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
  const storyContext = await getStoryContext(page, context);
  const fitToContent = getFitToContentFromParameters(storyContext.parameters);
  await storybookArgosScreenshot(
    page,
    {
      name: storyContext.id,
      playwrightLibraries: ["@storybook/test-runner"],
      beforeScreenshot: async ({ handler }) => {
        await waitForPageReady(handler);
      },
      story: {
        id: storyContext.id,
        parameters: storyContext.parameters,
        // We don't have access to globals in this context.
        globals: null,
      },
      setViewportSize: async (size) => {
        if (size === "default") {
          // Set the default viewport of Playwright.
          await page.setViewportSize({ width: 1280, height: 720 });
        } else {
          await page.setViewportSize(size);
        }
      },
    },
    applyFitToContent(options, fitToContent),
  );
}

/**
 * Apply fitToContent options to the screenshot options.
 */
function applyFitToContent(
  options: ArgosScreenshotOptions | undefined,
  fitToContent: FitToContent | null,
): ArgosScreenshotOptions | undefined {
  if (!fitToContent) {
    return options;
  }

  const { padding, zoom } = fitToContent;
  return {
    ...options,
    element: "#storybook-root",
    argosCSS:
      `#storybook-root { padding: ${padding}px; width: fit-content; height: fit-content; zoom: ${zoom}; }` +
      (options?.argosCSS ?? ""),
  };
}
