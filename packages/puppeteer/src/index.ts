import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ElementHandle, Page, ScreenshotOptions } from "puppeteer";
import { createRequire } from "node:module";
import {
  type ViewportOption,
  resolveViewport,
  type ArgosGlobal,
  getGlobalScript,
  type ViewportSize,
  type StabilizationPluginOptions,
  type StabilizationContext,
} from "@argos-ci/browser";
import {
  type ScreenshotMetadata,
  getScreenshotName,
  readVersionFromPackage,
  validateThreshold,
  writeMetadata,
} from "@argos-ci/util";

const require = createRequire(import.meta.url);

/**
 * Inject Argos script into the page.
 */
async function injectArgos(page: Page) {
  const injected = await page.evaluate(
    () => typeof (window as any).__ARGOS__ !== "undefined",
  );
  if (injected) {
    return;
  }
  await page.addScriptTag({ content: getGlobalScript() });
}

/**
 * Accepts all Puppeteer screenshot options and adds Argos-specific options.
 */
export type ArgosScreenshotOptions = Omit<
  ScreenshotOptions,
  "encoding" | "type" | "omitBackground" | "path"
> & {
  /**
   * ElementHandle or string selector of the element to take a screenshot of.
   */
  element?: string | ElementHandle;

  /**
   * Viewports to take screenshots of.
   */
  viewports?: ViewportOption[];

  /**
   * Custom CSS evaluated during the screenshot process.
   */
  argosCSS?: string;

  /**
   * Disable hover effects by moving the mouse to the top-left corner of the page.
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
   * Wait for the UI to stabilize before taking the screenshot.
   * Set to `false` to disable stabilization.
   * Pass an object to customize the stabilization.
   * @default true
   */
  stabilize?: boolean | StabilizationPluginOptions;
};

async function getPuppeteerVersion(): Promise<string> {
  const pkgPath = require.resolve("puppeteer/package.json");
  return readVersionFromPackage(pkgPath);
}

async function getArgosPuppeteerVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/puppeteer/package.json");
  return readVersionFromPackage(pkgPath);
}

function getViewport(page: Page) {
  const viewport = page.viewport();
  if (!viewport) {
    throw new Error("Can't take screenshots without a viewport.");
  }
  return viewport;
}

async function getBrowserInfo(page: Page) {
  const rawVersion = await page.browser().version();
  const [browserName, browserVersion] = rawVersion.split("/");
  return { browserName, browserVersion };
}

async function getScreenshotPath(name: string) {
  if (name.endsWith(".png")) {
    return name;
  }

  const screenshotFolder = resolve(process.cwd(), "screenshots/argos");
  await mkdir(screenshotFolder, { recursive: true });
  return resolve(screenshotFolder, name + ".png");
}

function checkIsFullPage(options: ArgosScreenshotOptions) {
  return options.fullPage !== undefined
    ? options.fullPage
    : options.element === undefined;
}

/**
 * Sets the viewport size and waits for the visual viewport to match the specified dimensions.
 * @returns A promise that resolves when the viewport size has been successfully set and matched.
 */
async function setViewportSize(page: Page, viewportSize: ViewportSize) {
  await page.setViewport(viewportSize);
  await page.waitForFunction(
    ({ width, height }) =>
      window.innerWidth === width && window.innerHeight === height,
    {},
    { width: viewportSize.width, height: viewportSize.height },
  );
}

/**
 * Get the stabilization context from the options.
 */
function getStabilizationContext(
  options: ArgosScreenshotOptions,
): StabilizationContext {
  const { argosCSS, viewports } = options;
  const fullPage = checkIsFullPage(options);

  return {
    fullPage,
    argosCSS,
    viewports,
    options: options.stabilize,
  };
}

/**
 * Run before taking all screenshots.
 */
async function beforeAll(page: Page, options: ArgosScreenshotOptions) {
  const { disableHover = true } = options;

  const context = getStabilizationContext(options);

  await page.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeAll(context),
    context,
  );

  if (disableHover) {
    await page.mouse.move(0, 0);
  }

  return async () => {
    await page.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterAll(),
    );
  };
}

/**
 * Run before taking each screenshot.
 */
async function beforeEach(page: Page, options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);

  await page.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeEach(context),
    context,
  );

  return async () => {
    await page.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterEach(),
    );
  };
}

/**
 * Wait for the UI to be ready before taking the screenshot.
 */
async function waitForReadiness(page: Page, options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);

  try {
    await page.waitForFunction(
      (context) => ((window as any).__ARGOS__ as ArgosGlobal).waitFor(context),
      undefined,
      context,
    );
  } catch (error) {
    const reasons = await page.evaluate(
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
 * Stabilize the UI and takes a screenshot of the application under test.
 *
 * @example
 *    argosScreenshot(page, "my-screenshot")
 * @see https://argos-ci.com/docs/puppeteer#api-overview
 */
export async function argosScreenshot(
  /**
   * Puppeteer `page` object.
   */
  page: Page,
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
    viewports,
    argosCSS: _argosCSS,
    ...puppeteerOptions
  } = options;
  if (!page) {
    throw new Error("A Puppeteer `page` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const [originalViewport] = await Promise.all([
    getViewport(page),
    // Inject Argos script into the page
    injectArgos(page),
  ]);

  const afterAll = await beforeAll(page, options);
  const fullPage = checkIsFullPage(options);

  async function collectMetadata(): Promise<ScreenshotMetadata> {
    const [
      colorScheme,
      mediaType,
      puppeteerVersion,
      argosPuppeteerVersion,
      { browserName, browserVersion },
    ] = await Promise.all([
      page.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
      ),
      page.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
      ),
      getPuppeteerVersion(),
      getArgosPuppeteerVersion(),
      getBrowserInfo(page),
    ]);

    const viewport = getViewport(page);

    const metadata: ScreenshotMetadata = {
      url: page.url(),
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme,
      mediaType,
      test: null,
      browser:
        browserName || browserVersion
          ? {
              name: browserName || "unknown",
              version: browserVersion || "unknown",
            }
          : undefined,
      automationLibrary: {
        name: "puppeteer",
        version: puppeteerVersion,
      },
      sdk: {
        name: "@argos-ci/puppeteer",
        version: argosPuppeteerVersion,
      },
    };

    metadata.transient = {};

    if (options?.threshold !== undefined) {
      validateThreshold(options.threshold);
      metadata.transient.threshold = options.threshold;
    }

    return metadata;
  }

  async function stabilizeAndScreenshot(name: string) {
    await waitForReadiness(page, options);
    const afterEach = await beforeEach(page, options);
    await waitForReadiness(page, options);

    const [screenshotPath, metadata] = await Promise.all([
      getScreenshotPath(name),
      collectMetadata(),
    ]);

    await writeMetadata(screenshotPath, metadata);

    const screenshotOptions: ScreenshotOptions = {
      path: screenshotPath,
      type: "png",
      fullPage,
      ...puppeteerOptions,
    };

    // If no element is specified, take a screenshot of the whole page
    if (element === undefined) {
      await page.screenshot(screenshotOptions);
    }

    // If a string is passed, take a screenshot of the element matching the selector
    else if (typeof element === "string") {
      await page.waitForSelector(element);
      const handle = await page.$(element);
      if (!handle) {
        throw new Error(`Unable to find element ${element}`);
      }
      await handle.screenshot(screenshotOptions);
    }

    // If an element is passed, take a screenshot of it
    else {
      await element.screenshot(screenshotOptions);
    }

    await afterEach();
  }

  // If no viewports are specified, take a single screenshot
  if (viewports) {
    // Take screenshots for each viewport
    for (const viewport of viewports) {
      const viewportSize = resolveViewport(viewport);
      await setViewportSize(page, viewportSize);
      await stabilizeAndScreenshot(
        getScreenshotName(name, { viewportWidth: viewportSize.width }),
      );
    }
    // Restore the original viewport
    await setViewportSize(page, originalViewport);
  } else {
    await stabilizeAndScreenshot(name);
  }

  await afterAll();
}
