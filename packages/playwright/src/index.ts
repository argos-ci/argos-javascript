import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
  TestInfo,
  Locator,
} from "@playwright/test";
import {
  ViewportOption,
  resolveViewport,
  ArgosGlobal,
  getGlobalScript,
} from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  ScreenshotMetadata,
  validateThreshold,
  writeMetadata,
} from "@argos-ci/util";
import { getAttachmentName } from "./attachment";
import { getLibraryMetadata, getTestMetadataFromTestInfo } from "./metadata";
import { checkIsUsingArgosReporter } from "./util";

const screenshotFolder = "./screenshots";

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
} & LocatorOptions &
  ScreenshotOptions<LocatorScreenshotOptions> &
  ScreenshotOptions<PageScreenshotOptions>;

/**
 * Inject Argos script into the page.
 */
async function injectArgos(page: Page) {
  const injected = await page.evaluate(
    () => typeof (window as any).__ARGOS__ !== "undefined",
  );
  if (injected) return;
  await page.addScriptTag({ content: getGlobalScript() });
}

async function getTestInfo() {
  try {
    const { test } = await import("@playwright/test");
    return test.info();
  } catch (error: unknown) {
    return null;
  }
}

function getViewportSize(page: Page) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) {
    throw new Error("Can't take screenshots without a viewport.");
  }
  return viewportSize;
}

/**
 * Setup Argos for the screenshot process.
 * @returns A function to teardown Argos.
 */
async function setup(page: Page, options: ArgosScreenshotOptions) {
  const { disableHover = true, fullPage, argosCSS } = options;
  await page.evaluate(
    ({ fullPage, argosCSS }) =>
      ((window as any).__ARGOS__ as ArgosGlobal).setup({ fullPage, argosCSS }),
    { fullPage, argosCSS },
  );
  if (disableHover) {
    await page.mouse.move(0, 0);
  }

  return async () => {
    await page.evaluate(
      ({ fullPage, argosCSS }) =>
        ((window as any).__ARGOS__ as ArgosGlobal).teardown({
          fullPage,
          argosCSS,
        }),
      { fullPage, argosCSS },
    );
  };
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
   * Name of the screenshot. Must be unique.
   */
  name: string,
  /**
   * Options for the screenshot.
   */
  options: ArgosScreenshotOptions = {},
) {
  const { element, has, hasText, viewports, argosCSS, ...playwrightOptions } =
    options;
  if (!page) {
    throw new Error("A Playwright `page` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const handle =
    typeof element === "string"
      ? page.locator(element, { has, hasText })
      : element ?? page;

  const testInfo = await getTestInfo();

  const useArgosReporter = Boolean(
    testInfo && checkIsUsingArgosReporter(testInfo),
  );

  await Promise.all([
    // Create the screenshot folder if it doesn't exist
    useArgosReporter ? null : mkdir(screenshotFolder, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(page),
  ]);

  const originalViewportSize = getViewportSize(page);

  const fullPage =
    options.fullPage !== undefined ? options.fullPage : handle === page;

  const teardown = await setup(page, options);

  const collectMetadata = async (
    testInfo: TestInfo | null,
  ): Promise<ScreenshotMetadata> => {
    const [colorScheme, mediaType, libMetadata, testMetadata] =
      await Promise.all([
        page.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
        ),
        page.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
        ),
        getLibraryMetadata(),
        testInfo ? getTestMetadataFromTestInfo(testInfo) : null,
      ]);

    const viewportSize = getViewportSize(page);

    const browser = page.context().browser();
    if (!browser) {
      throw new Error("Can't take screenshots without a browser.");
    }
    const browserName = browser.browserType().name();
    const browserVersion = browser.version();

    const metadata: ScreenshotMetadata = {
      url: page.url(),
      viewport: viewportSize,
      colorScheme,
      mediaType,
      test: testMetadata,
      browser: {
        name: browserName,
        version: browserVersion,
      },
      ...libMetadata,
    };

    return metadata;
  };

  const stabilizeAndScreenshot = async (name: string) => {
    await page.waitForFunction(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).waitForStability(),
    );

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
        : resolve(screenshotFolder, `${names.name}.png`);

    const dir = dirname(screenshotPath);
    if (dir !== screenshotFolder) {
      await mkdir(dirname(screenshotPath), { recursive: true });
    }

    await Promise.all([
      handle.screenshot({
        path: screenshotPath,
        type: "png",
        fullPage,
        mask: [page.locator('[data-visual-test="blackout"]')],
        animations: "disabled",
        ...playwrightOptions,
      }),
      writeMetadata(screenshotPath, metadata),
    ]);

    if (useArgosReporter && testInfo) {
      await Promise.all([
        testInfo.attach(getAttachmentName(names.name, "metadata"), {
          path: getMetadataPath(screenshotPath),
          contentType: "application/json",
        }),
        testInfo.attach(getAttachmentName(names.name, "screenshot"), {
          path: screenshotPath,
          contentType: "image/png",
        }),
      ]);
    }
  };

  // If no viewports are specified, take a single screenshot
  if (viewports) {
    // Take screenshots for each viewport
    for (const viewport of viewports) {
      const viewportSize = resolveViewport(viewport);
      await page.setViewportSize(viewportSize);
      await stabilizeAndScreenshot(
        getScreenshotName(name, { viewportWidth: viewportSize.width }),
      );
    }

    // Restore the original viewport size
    await page.setViewportSize(originalViewportSize);
  } else {
    await stabilizeAndScreenshot(name);
  }

  await teardown();
}
