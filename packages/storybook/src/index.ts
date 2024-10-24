import { TestContext, waitForPageReady } from "@storybook/test-runner";
import type { Page, PageScreenshotOptions } from "playwright";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { ScreenshotMetadata } from "@argos-ci/util";

export type ArgosScreenshotOptions = {
  /**
   * Folder where the screenshots will be saved.
   * @default "./screenshots"
   */
  root?: string;
} & Omit<PageScreenshotOptions, "type">;

export async function argosScreenshot(
  page: Page,
  context: TestContext,
  options?: ArgosScreenshotOptions,
) {
  await waitForPageReady(page);
  const { root = "./screenshots", ...screenshotOptions } = options ?? {};
  const path = join(root, context.title, `${context.name}.png`);
  const metadataPath = getMetadataPath(path);

  const [mediaType, colorScheme] = await Promise.all([
    getMediaType(page),
    getColorScheme(page),
  ]);

  const metadata: ScreenshotMetadata = {
    url: page.url(),
    colorScheme,
    mediaType,
    automationLibrary: getAutomationLibraryInfo(),
    sdk: getSDKInfo(),
    test: null,
    browser: getBrowserInfo(page),
    viewport: getViewportSize(page),
  };

  await page.screenshot({
    animations: "disabled",
    type: "png",
    path,
    ...screenshotOptions,
  });

  await writeFile(metadataPath, JSON.stringify(metadata));
}

/**
 * Get the media type of the page.
 */
async function getMediaType(page: Page) {
  return page.evaluate(() =>
    window.matchMedia("print").matches ? "print" : "screen",
  );
}

/**
 * Get the color scheme of the page.
 */
async function getColorScheme(page: Page) {
  return page.evaluate(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );
}

/**
 * Get the automation library info.
 */
function getAutomationLibraryInfo() {
  return {
    name: "storybook",
    version: getStorybookVersion(),
  };
}

/**
 * Get the Storybook version.
 */
function getStorybookVersion() {
  try {
    const pkg = require("storybook/package.json");
    return pkg.version;
  } catch {
    return "unknown";
  }
}

/**
 * Get the SDK name and version.
 */
function getSDKInfo() {
  return {
    name: "@argos-ci/storybook",
    version: require("@argos-ci/storybook/package.json").version,
  };
}

/**
 * Get the browser name and version.
 */
function getBrowserInfo(page: Page) {
  const browser = page.context().browser();
  if (!browser) {
    throw new Error("Can't take screenshots without a browser.");
  }
  return { name: browser.browserType().name(), version: browser.version() };
}

/**
 * Get the viewport size of the page.
 */
function getViewportSize(page: Page) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) {
    throw new Error("Can't take screenshots without a viewport.");
  }
  return viewportSize;
}

/**
 * Get metadata path from screenshot path.
 */
function getMetadataPath(screenshotPath: string) {
  return screenshotPath + ".argos.json";
}
