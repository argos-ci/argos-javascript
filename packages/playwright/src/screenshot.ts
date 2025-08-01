import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
  TestInfo,
  Locator,
  ViewportSize,
  Frame,
} from "@playwright/test";
import {
  type ViewportOption,
  resolveViewport,
  type ArgosGlobal,
  getGlobalScript,
  type StabilizationPluginOptions,
  type StabilizationContext,
} from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  type ScreenshotMetadata,
  validateThreshold,
  writeMetadata,
} from "@argos-ci/util";
import { getAttachmentName } from "./attachment";
import {
  getLibraryMetadata,
  getMetadataOverrides,
  getTestMetadata,
} from "./metadata";
import { checkIsUsingArgosReporter } from "./util";

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
 * Inject Argos script into the document.
 */
async function injectArgos(handler: Handler) {
  const injected = await handler.evaluate(
    () => typeof (window as any).__ARGOS__ !== "undefined",
  );
  if (!injected) {
    await handler.addScriptTag({ content: getGlobalScript() });
  }
}

/**
 * Get test info from the Playwright test.
 */
async function getTestInfo() {
  try {
    const { test } = await import("@playwright/test");
    return test.info();
  } catch {
    return null;
  }
}

/**
 * Check if the handler is a Frame.
 */
function checkIsFrame(handler: Handler): handler is Frame {
  return "page" in handler && typeof handler.page === "function";
}

/**
 * Get the Playwright `Page` from the handler.
 * If the handler is a Frame, it returns the parent page.
 * Otherwise, it returns the handler itself.
 */
function getPage(handler: Handler): Page {
  if (checkIsFrame(handler)) {
    return handler.page();
  }
  return handler;
}

/**
 * Get the viewport size.
 */
function getViewportSize(page: Page) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) {
    throw new Error("Can't take screenshots without a viewport.");
  }
  return viewportSize;
}

/**
 * Sets the viewport size and waits for the visual viewport to match the specified dimensions.
 * @returns A promise that resolves when the viewport size has been successfully set and matched.
 */
async function setViewportSize(page: Page, viewportSize: ViewportSize) {
  await page.setViewportSize(viewportSize);
  await page.waitForFunction(
    ({ width, height }) =>
      window.innerWidth === width && window.innerHeight === height,
    { width: viewportSize.width, height: viewportSize.height },
  );
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

/**
 * Run before taking all screenshots.
 */
async function beforeAll(handler: Handler, options: ArgosScreenshotOptions) {
  const { disableHover = true } = options;
  const context = getStabilizationContext(options);
  await handler.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeAll(context),
    context,
  );
  if (disableHover) {
    await getPage(handler).mouse.move(0, 0);
  }
  return async () => {
    await handler.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterAll(),
    );
  };
}

/**
 * Run before taking each screenshot.
 */
async function beforeEach(handler: Handler, options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);
  await handler.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeEach(context),
    context,
  );
  return async () => {
    await handler.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterEach(),
    );
  };
}

/**
 * Increase the timeout for the test x3.
 * Returns a function to reset the timeout.
 */
async function increaseTimeout() {
  const testInfo = await getTestInfo();
  if (testInfo) {
    const { timeout } = testInfo;
    // Like in "slow" mode but we don't use it because we want to
    // be able to reset it.
    testInfo.setTimeout(timeout * 3);
    return {
      value: timeout,
      reset: () => {
        testInfo.setTimeout(timeout);
      },
    };
  }
  return null;
}

/**
 * Wait for the UI to be ready before taking the screenshot.
 */
async function waitForReadiness(
  handler: Handler,
  options: ArgosScreenshotOptions,
) {
  const context = getStabilizationContext(options);
  // We increase the timeout, so we will be able to get reasons
  // if the stabilization fails.
  const timeout = await increaseTimeout();

  try {
    await handler.waitForFunction(
      (context) => {
        const argos = (window as any).__ARGOS__ as ArgosGlobal;
        return argos.waitFor(context);
      },
      context,
      timeout ? { timeout: timeout.value } : undefined,
    );
    timeout?.reset();
  } catch (error) {
    const reasons = await handler.evaluate(
      (context) =>
        ((window as any).__ARGOS__ as ArgosGlobal).getWaitFailureExplanations(
          context,
        ),
      context,
    );
    throw new Error(
      `
Failed to stabilize screenshot, found the following issues:
${reasons.map((reason) => `- ${reason}`).join("\n")}
        `.trim(),
      { cause: error },
    );
  }
}

/**
 * Get the screenshot names based on the test info.
 */
function getScreenshotNames(name: string, testInfo: TestInfo | null) {
  if (testInfo) {
    const projectName = `${testInfo.project.name}/${name}`;

    if (testInfo.repeatEachIndex > 0) {
      return {
        name: `${projectName} repeat-${testInfo.repeatEachIndex}`,
        baseName: projectName,
      };
    }

    return { name: projectName, baseName: null };
  }

  return { name, baseName: null };
}

export type Attachment = {
  name: string;
  contentType: string;
  path: string;
};

type Handler = Page | Frame;

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
  handler: Handler,
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
      ? handler.locator(element, { has, hasText })
      : (element ??
        (checkIsFrame(handler) ? handler.locator("body") : handler));

  const testInfo = await getTestInfo();

  const useArgosReporter = Boolean(
    testInfo && checkIsUsingArgosReporter(testInfo),
  );

  await Promise.all([
    // Create the screenshot folder if it doesn't exist
    useArgosReporter ? null : mkdir(root, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(handler),
  ]);

  const originalViewportSize = checkIsFrame(handler)
    ? null
    : getViewportSize(handler);

  const fullPage =
    options.fullPage !== undefined
      ? options.fullPage
      : screenshotTarget === handler;

  const afterAll = await beforeAll(handler, options);

  const collectMetadata = async (
    testInfo: TestInfo | null,
  ): Promise<ScreenshotMetadata> => {
    const overrides = getMetadataOverrides();
    const [colorScheme, mediaType, libMetadata, testMetadata] =
      await Promise.all([
        handler.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
        ),
        handler.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
        ),
        getLibraryMetadata(),
        getTestMetadata(testInfo),
      ]);

    const viewportSize = checkIsFrame(handler)
      ? null
      : getViewportSize(handler);

    const browser = getPage(handler).context().browser();
    if (!browser) {
      throw new Error("Can't take screenshots without a browser.");
    }
    const browserName = browser.browserType().name();
    const browserVersion = browser.version();
    const url = overrides?.url ?? handler.url();

    const metadata: ScreenshotMetadata = {
      url,
      colorScheme,
      mediaType,
      test: testMetadata,
      browser: {
        name: browserName,
        version: browserVersion,
      },
      ...libMetadata,
    };

    const viewport = viewportSize ?? getMetadataOverrides()?.viewport;

    if (viewport) {
      metadata.viewport = viewport;
    }

    return metadata;
  };

  const stabilizeAndScreenshot = async (name: string) => {
    const names = getScreenshotNames(name, testInfo);

    const metadata = await collectMetadata(testInfo);
    metadata.transient = {};

    if (options.threshold !== undefined) {
      validateThreshold(options.threshold);
      metadata.transient.threshold = options.threshold;
    }

    if (names.baseName) {
      metadata.transient.baseName = `${names.baseName}.png`;
    }

    const screenshotPath =
      useArgosReporter && testInfo
        ? testInfo.outputPath("argos", `${names.name}.png`)
        : resolve(root, `${names.name}.png`);

    const dir = dirname(screenshotPath);
    if (dir !== root) {
      await mkdir(dirname(screenshotPath), { recursive: true });
    }

    await options.beforeScreenshot?.({
      runStabilization: (stabilizationOptions) =>
        waitForReadiness(handler, {
          ...options,
          stabilize: stabilizationOptions ?? options.stabilize,
        }),
    });

    await waitForReadiness(handler, options);
    const afterEach = await beforeEach(handler, options);
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

    const attachments: Attachment[] = [
      {
        name: getAttachmentName(names.name, "screenshot"),
        contentType: "image/png",
        path: screenshotPath,
      },
      {
        name: getAttachmentName(names.name, "metadata"),
        contentType: "application/json",
        path: getMetadataPath(screenshotPath),
      },
    ];

    if (useArgosReporter && testInfo) {
      await Promise.all(
        attachments.map((attachment) =>
          testInfo.attach(attachment.name, {
            path: attachment.path,
            contentType: attachment.contentType,
          }),
        ),
      );
    }

    await afterEach();
    await options.afterScreenshot?.();

    return attachments;
  };

  const allAttachments: Attachment[] = [];

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
