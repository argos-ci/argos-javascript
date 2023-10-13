import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
} from "@playwright/test";
import { createRequire } from "node:module";
import { ArgosGlobal } from "@argos-ci/browser/global.js";
import {
  ViewportOption,
  getScreenshotName,
  resolveViewport,
} from "@argos-ci/browser";

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

  const [originalViewportSize] = await Promise.all([
    page.viewportSize(),
    // Create the screenshot folder if it doesn't exist
    mkdir(screenshotFolder, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(page),
  ]);

  if (!originalViewportSize) {
    throw new Error("Can't take screenshots without a viewport.");
  }

  await page.evaluate(() =>
    ((window as any).__ARGOS__ as ArgosGlobal).prepareForScreenshot(),
  );

  async function stabilizeAndScreenshot(name: string) {
    await page.waitForFunction(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).waitForStability(),
    );

    await handle.screenshot({
      path: resolve(screenshotFolder, `${name}.png`),
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
