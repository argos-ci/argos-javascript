import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
  TestInfo,
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

export async function argosScreenshot(
  page: Page,
  name: string,
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

    const metadata = await collectMetadata(testInfo);
    const nameInProject = testInfo?.project.name
      ? `${testInfo.project.name}/${name}`
      : name;

    const screenshotPath =
      useArgosReporter && testInfo
        ? testInfo.outputPath("argos", `${nameInProject}.png`)
        : resolve(screenshotFolder, `${nameInProject}.png`);

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
        testInfo.attach(getAttachmentName(nameInProject, "metadata"), {
          path: getMetadataPath(screenshotPath),
          contentType: "application/json",
        }),
        testInfo.attach(getAttachmentName(nameInProject, "screenshot"), {
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
        getScreenshotName(name, {
          viewportWidth: viewportSize.width,
        }),
      );
    }

    // Restore the original viewport size
    await page.setViewportSize(originalViewportSize);
  } else {
    await stabilizeAndScreenshot(name);
  }

  await teardown();
}
