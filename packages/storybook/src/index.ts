import type { TestContext } from "@storybook/test-runner";
import { getStoryContext, waitForPageReady } from "@storybook/test-runner";
import {
  argosScreenshot as argosPlaywrightScreenshot,
  DO_NOT_USE_setMetadataConfig,
} from "@argos-ci/playwright";
import type { ArgosScreenshotOptions as ArgosPlaywrightScreenshotOptions } from "@argos-ci/playwright";
import { join } from "node:path";
import type { Page, ViewportSize } from "playwright";
import { getArgosStorybookVersion } from "./metadata";

/**
 * Storybook mode.
 */
type StorybookGlobals = Record<string, any>;

/**
 * Argos parameters in Storybook.
 */
export interface ArgosStorybookParameters {
  /**
   * Modes for the story.
   */
  modes?: Record<string, StorybookGlobals>;
}

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

  const argosOptions = {
    ...screenshotOptions,
    // Disable aria-busy stabilization by default
    stabilize: screenshotOptions.stabilize ?? {
      waitForAriaBusy: false,
      ...(typeof screenshotOptions.stabilize === "object"
        ? screenshotOptions.stabilize
        : {}),
    },
    ...fitToContentOptions,
  };

  const [version, storyContext] = await Promise.all([
    getArgosStorybookVersion(),
    getStoryContext(page, context),
  ]);

  const defaultViewport = getDefaultViewport(storyContext.parameters);

  if (defaultViewport) {
    // Set the viewport size to the default viewport size from Storybook.
    await page.setViewportSize(defaultViewport);
  } else {
    // Set the viewport size to the default size from Playwright.
    await page.setViewportSize({ width: 1280, height: 720 });
  }

  DO_NOT_USE_setMetadataConfig({
    sdk: { name: "@argos-ci/storybook", version },
    playwrightLibraries: ["@storybook/test-runner"],
  });

  const argosParameters = getArgosParameters(storyContext.parameters);
  const modes = argosParameters?.modes;

  if (modes) {
    for (const [name, globals] of Object.entries(modes)) {
      // Skip disabled modes.
      if (globals.disabled) {
        continue;
      }
      await setStorybookGlobals({ page, globals });
      if (globals.viewport) {
        const viewport = getViewport(storyContext.parameters, globals.viewport);
        if (viewport) {
          await page.setViewportSize(viewport);
        }
      }
      await stabilizeAndScreenshot({
        page,
        context,
        options: argosOptions,
        suffix: ` ${name}`,
      });
    }
  } else {
    await stabilizeAndScreenshot({ page, context, options: argosOptions });
  }
}

/**
 * Set the Storybook globals.
 */
async function setStorybookGlobals(args: {
  page: Page;
  globals: StorybookGlobals;
}) {
  const { page, globals } = args;
  await page.evaluate((globals) => {
    const channel = (globalThis as any).__STORYBOOK_PREVIEW__.channel;
    channel.emit("updateGlobals", {
      globals: {
        ...channel.last("globalsUpdated")?.[0].initialGlobals,
        ...globals,
      },
    });
  }, globals);
}

/**
 * Wait for the page to be ready and take a screenshot.
 */
async function stabilizeAndScreenshot(args: {
  page: Page;
  context: TestContext;
  options: ArgosScreenshotOptions;
  suffix?: string;
}) {
  const { page, context, options } = args;
  await waitForPageReady(page);
  return argosPlaywrightScreenshot(
    page,
    join(context.title, context.name) + (args.suffix ?? ""),
    options,
  );
}

/**
 * Get the default viewport size from the Storybook parameters.
 */
function getDefaultViewport(
  parameters: Record<string, any>,
): ViewportSize | null {
  const defaultViewport = parameters?.viewport?.defaultViewport;
  if (defaultViewport) {
    return getViewport(parameters, defaultViewport);
  }
  return null;
}

/**
 * Get the viewport size from the Storybook parameters.
 */
function getViewport(
  parameters: Record<string, any>,
  viewportName: string,
): ViewportSize | null {
  if (typeof viewportName === "number") {
    return { width: viewportName, height: 720 };
  }
  const viewports = parameters?.viewport?.viewports;
  if (viewports && viewportName in viewports) {
    if ("styles" in viewports[viewportName] && viewports[viewportName].styles) {
      const width = parseInt(viewports[viewportName].styles.width, 10);
      const height = parseInt(viewports[viewportName].styles.height, 10);
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
    }
  }
  return null;
}

/**
 * Get the Argos parameters from the Storybook context.
 */
function getArgosParameters(
  parameters: Record<string, any>,
): ArgosStorybookParameters | null {
  if (
    "argos" in parameters &&
    parameters.argos &&
    typeof parameters.argos === "object"
  ) {
    return parameters.argos;
  }
  // Also support chromatic parameters for backward compatibility.
  if (
    "chromatic" in parameters &&
    parameters.chromatic &&
    typeof parameters.chromatic === "object"
  ) {
    return parameters.chromatic;
  }

  return null;
}
