import { mkdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
} from "@playwright/test";
import { createRequire } from "node:module";
import { ArgosGlobal } from "@argos-ci/browser/global.js";
import { ViewportOption, resolveViewport } from "@argos-ci/browser";
import {
  getScreenshotName,
  ScreenshotMetadata,
  readVersionFromPackage,
  writeMetadata,
  getGitRepositoryPath,
} from "@argos-ci/util";

const require = createRequire(import.meta.url);

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
} & LocatorOptions &
  ScreenshotOptions<LocatorScreenshotOptions> &
  ScreenshotOptions<PageScreenshotOptions>;

/**
 * Inject Argos script into the page.
 */
async function injectArgos(page: Page) {
  const fileName = require.resolve("@argos-ci/browser/global.js");
  const content = await readFile(fileName, "utf-8");
  await page.addScriptTag({ content });
}

async function getPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("playwright/package.json");
  return readVersionFromPackage(pkgPath);
}

async function getArgosPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/playwright/package.json");
  return readVersionFromPackage(pkgPath);
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

export async function argosScreenshot(
  page: Page,
  name: string,
  { element, has, hasText, viewports, ...options }: ArgosScreenshotOptions = {},
) {
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

  await Promise.all([
    // Create the screenshot folder if it doesn't exist
    mkdir(screenshotFolder, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(page),
  ]);

  const originalViewportSize = getViewportSize(page);

  await page.evaluate(() =>
    ((window as any).__ARGOS__ as ArgosGlobal).prepareForScreenshot(),
  );

  async function collectMetadata(): Promise<ScreenshotMetadata> {
    const [
      testInfo,
      repoPath,
      colorScheme,
      mediaType,
      playwrightVersion,
      argosPlaywrightVersion,
    ] = await Promise.all([
      getTestInfo(),
      getGitRepositoryPath(),
      page.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
      ),
      page.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
      ),
      getPlaywrightVersion(),
      getArgosPlaywrightVersion(),
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
      test: testInfo
        ? {
            id: testInfo.testId,
            title: testInfo.title,
            titlePath: testInfo.titlePath,
            location: {
              file: repoPath
                ? relative(repoPath, testInfo.file)
                : testInfo.file,
              line: testInfo.line,
              column: testInfo.column,
            },
          }
        : null,
      browser: {
        name: browserName,
        version: browserVersion,
      },
      automationLibrary: {
        name: "playwright",
        version: playwrightVersion,
      },
      sdk: {
        name: "@argos-ci/playwright",
        version: argosPlaywrightVersion,
      },
    };

    return metadata;
  }

  async function stabilizeAndScreenshot(name: string) {
    await page.waitForFunction(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).waitForStability(),
    );

    const metadata = await collectMetadata();
    const screenshotPath = resolve(screenshotFolder, `${name}.png`);

    await writeMetadata(screenshotPath, metadata);

    await handle.screenshot({
      path: screenshotPath,
      type: "png",
      fullPage: handle === page,
      mask: [page.locator('[data-visual-test="blackout"]')],
      animations: "disabled",
      ...options,
    });
  }

  // If no viewports are specified, take a single screenshot
  if (!viewports) {
    await stabilizeAndScreenshot(name);
    return;
  }

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
}
