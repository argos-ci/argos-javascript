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

const DEFAULT_PLAYWRIGHT_VIEWPORT_SIZE = { width: 1280, height: 720 };

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
      mode: "automatic",
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
        const actualSize = await page.viewportSize();
        const absoluteSize =
          size === "default" ? DEFAULT_PLAYWRIGHT_VIEWPORT_SIZE : size;
        if (
          !actualSize ||
          actualSize.height !== absoluteSize.height ||
          actualSize.width !== absoluteSize.width
        ) {
          await page.setViewportSize(absoluteSize);
          await page.waitForFunction(
            ({ width, height }) =>
              window.innerWidth === width && window.innerHeight === height,
            { width: absoluteSize.width, height: absoluteSize.height },
          );
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
