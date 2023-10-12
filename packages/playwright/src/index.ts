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
  { element, has, hasText, ...options }: ArgosScreenshotOptions = {},
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

  await page.evaluate(() =>
    ((window as any).__ARGOS__ as ArgosGlobal).prepareForScreenshot(),
  );
  await page.waitForFunction(() =>
    ((window as any).__ARGOS__ as ArgosGlobal).waitForStability(),
  );

  await handle.screenshot({
    path: resolve(screenshotFolder, `${name}.png`),
    type: "png",
    fullPage: true,
    mask: [page.locator('[data-visual-test="blackout"]')],
    animations: "disabled",
    ...options,
  });
}
