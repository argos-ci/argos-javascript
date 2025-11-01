import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
  Locator,
  Frame,
} from "@playwright/test";
import {
  type ViewportOption,
  resolveViewport,
  type StabilizationPluginOptions,
  type StabilizationContext,
} from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  validateThreshold,
  writeMetadata,
} from "@argos-ci/util";
import { getAttachmentName, type ArgosAttachment } from "./attachment";
import {
  attachAttachments,
  beforeAll,
  beforeEach,
  checkIsFrame,
  checkIsUsingArgosReporter,
  getPathAndMetadata,
  getSnapshotNames,
  getTestInfo,
  getViewportSize,
  PNG_EXTENSION,
  prepare,
  setViewportSize,
  waitForReadiness,
} from "./util";

const DEFAULT_SCREENSHOT_ROOT = "./screenshots";

type LocatorOptions = Parameters<Page["locator"]>[1];

type ScreenshotOptions<
  TBase extends PageScreenshotOptions | LocatorScreenshotOptions,
> = Omit<TBase, "encoding" | "type" | "omitBackground" | "path">;

export type ArgosScreenshotOptions = {
  /**
   * `Locator` or string selector of the element to take a screenshot of.
   * Passing an `ElementHandle` is discouraged, use a `Locator` instead.
   */
  element?: string | ElementHandle | Locator;

  /**
   * Viewports to take screenshots of.
   */
  viewports?: ViewportOption[];

  /**
   * Custom CSS evaluated during the screenshot process.
   */
  argosCSS?: string;

  /**
   * Disable hover effects by moving the mouse to the top-left corner of the document.
   * @default true
   */
  disableHover?: boolean;

  /**
   * Sensitivity threshold between 0 and 1.
   * The higher the threshold, the less sensitive the diff will be.
   * @default 0.5
   */
  threshold?: number;

  /**
   * Folder where the screenshots will be saved if not using the Argos reporter.
   * @default "./screenshots"
   */
  root?: string;

  /**
   * Wait for the UI to stabilize before taking the screenshot.
   * Set to `false` to disable stabilization.
   * Pass an object to customize the stabilization.
   * @default true
   */
  stabilize?: boolean | StabilizationPluginOptions;

  /**
   * Run a function before taking the screenshot.
   * When using viewports, this function will run before taking sreenshots on each viewport.
   */
  beforeScreenshot?: (api: {
    /**
     * Run Argos stabilization alorithm.
     * Accepts an object to customize the stabilization.
     * Note that this function is independent of the `stabilize` option.
     */
    runStabilization: (options?: StabilizationPluginOptions) => Promise<void>;
  }) => Promise<void> | void;

  /**
   * Run a function after taking the screenshot.
   * When using viewports, this function will run after taking sreenshots on each viewport.
   */
  afterScreenshot?: () => Promise<void> | void;
} & LocatorOptions &
  ScreenshotOptions<LocatorScreenshotOptions> &
  ScreenshotOptions<PageScreenshotOptions>;

/**
 * Stabilize the UI and takes a screenshot of the application under test.
 *
 * @example
 *    argosScreenshot(page, "my-screenshot")
 * @see https://argos-ci.com/docs/playwright#api-overview
 */
export async function argosScreenshot(
  /**
   * Playwright `page` or `frame` object.
   */
  handler: Page | Frame,
  /**
   * Name of the screenshot. Must be unique.
   */
  name: string,
  /**
   * Options for the screenshot.
   */
  options: ArgosScreenshotOptions = {},
) {
  const {
    element,
    has,
    hasText,
    hasNot,
    hasNotText,
    viewports,
    argosCSS: _argosCSS,
    root = DEFAULT_SCREENSHOT_ROOT,
    ...playwrightOptions
  } = options;

  if (!handler) {
    throw new Error("A Playwright `handler` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const screenshotTarget =
    typeof element === "string"
      ? handler.locator(element, { has, hasText, hasNot, hasNotText })
      : (element ??
        (checkIsFrame(handler) ? handler.locator("body") : handler));

  const testInfo = await getTestInfo();

  const useArgosReporter = checkIsUsingArgosReporter(testInfo);

  await prepare({ handler, useArgosReporter, root });

  const originalViewportSize = checkIsFrame(handler)
    ? null
    : getViewportSize(handler);

  const fullPage =
    options.fullPage !== undefined
      ? options.fullPage
      : screenshotTarget === handler;

  const context = getStabilizationContext(options);
  const afterAll = await beforeAll(handler, context, options);

  const stabilizeAndScreenshot = async (name: string) => {
    const names = getSnapshotNames(name, testInfo);
    const { path: screenshotPath, metadata } = await getPathAndMetadata({
      handler,
      extension: PNG_EXTENSION,
      root,
      names,
      testInfo,
      useArgosReporter,
    });

    if (options.threshold !== undefined) {
      validateThreshold(options.threshold);
      if (!metadata.transient) {
        throw new Error("Invariant: transient metadata should exist");
      }
      metadata.transient.threshold = options.threshold;
    }

    await options.beforeScreenshot?.({
      runStabilization: (stabilizationOptions) =>
        waitForReadiness(
          handler,
          getStabilizationContext({
            ...options,
            stabilize: stabilizationOptions ?? options.stabilize,
          }),
        ),
    });

    await waitForReadiness(handler, options);
    const afterEach = await beforeEach(handler, context);
    await waitForReadiness(handler, options);

    await Promise.all([
      screenshotTarget.screenshot({
        path: screenshotPath,
        type: "png",
        fullPage,
        mask: [handler.locator('[data-visual-test="blackout"]')],
        animations: "disabled",
        ...playwrightOptions,
      }),
      writeMetadata(screenshotPath, metadata),
    ]);

    const attachments: ArgosAttachment[] = [
      {
        name: getAttachmentName(names.name, "screenshot"),
        contentType: "image/png",
        path: screenshotPath,
      },
      {
        name: getAttachmentName(names.name, "screenshot/metadata"),
        contentType: "application/json",
        path: getMetadataPath(screenshotPath),
      },
    ];

    await attachAttachments({ attachments, testInfo, useArgosReporter });

    await afterEach();
    await options.afterScreenshot?.();

    return attachments;
  };

  const allAttachments: ArgosAttachment[] = [];

  // If no viewports are specified, take a single screenshot
  if (viewports) {
    if (checkIsFrame(handler)) {
      throw new Error(`viewports option is not supported with an iframe`);
    }
    // Take screenshots for each viewport
    for (const viewport of viewports) {
      const viewportSize = resolveViewport(viewport);
      await setViewportSize(handler, viewportSize);
      const attachments = await stabilizeAndScreenshot(
        getScreenshotName(name, { viewportWidth: viewportSize.width }),
      );
      allAttachments.push(...attachments);
    }

    // Restore the original viewport size
    if (!originalViewportSize) {
      throw new Error(`Invariant: viewport size must be saved`);
    }
    await setViewportSize(handler, originalViewportSize);
  } else {
    const attachments = await stabilizeAndScreenshot(name);
    allAttachments.push(...attachments);
  }

  await afterAll();

  return allAttachments;
}

/**
 * Get the stabilization context from the options.
 */
function getStabilizationContext(
  options: ArgosScreenshotOptions,
): StabilizationContext {
  const { fullPage, argosCSS, stabilize, viewports } = options;
  return {
    fullPage,
    argosCSS,
    viewports,
    options: stabilize,
  };
}
