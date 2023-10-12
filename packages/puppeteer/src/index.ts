import { resolve } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { ElementHandle, Page, ScreenshotOptions } from "puppeteer";
import { createRequire } from "node:module";
import { ArgosGlobal } from "@argos-ci/browser/global.js";

const require = createRequire(import.meta.url);

/**
 * Inject Argos script into the page.
 */
async function injectArgos(page: Page) {
  const fileName = require.resolve("@argos-ci/browser/global.js");
  const content = await readFile(fileName, "utf-8");
  await page.addScriptTag({ content });
}

export type ArgosScreenshotOptions = Omit<
  ScreenshotOptions,
  "encoding" | "type" | "omitBackground" | "path"
> & {
  /**
   * ElementHandle or string selector of the element to take a screenshot of.
   */
  element?: string | ElementHandle;
};

export async function argosScreenshot(
  page: Page,
  name: string,
  { element, ...options }: ArgosScreenshotOptions = {},
) {
  if (!page) {
    throw new Error("A Puppeteer `page` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const screenshotFolder = resolve(process.cwd(), "screenshots/argos");

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

  const screenshotOptions: ScreenshotOptions = {
    path: resolve(screenshotFolder, `${name}.png`),
    type: "png",
    ...options,
  };

  // If no element is specified, take a screenshot of the whole page
  if (element === undefined) {
    await page.screenshot(screenshotOptions);
    return;
  }

  // If a string is passed, take a screenshot of the element matching the selector
  if (typeof element === "string") {
    await page.waitForSelector(element);
    const handle = await page.$(element);
    if (!handle) {
      throw new Error(`Unable to find element ${element}`);
    }
    await handle.screenshot(screenshotOptions);
    return;
  }

  // If an element is passed, take a screenshot of it
  await element.screenshot(screenshotOptions);
}
