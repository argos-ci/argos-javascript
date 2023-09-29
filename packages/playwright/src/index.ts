import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
} from "@playwright/test";

const screenshotFolder = "./screenshots";

const GLOBAL_STYLES = `
  /* Hide carets */
  * { caret-color: transparent !important; }

  /* Hide scrollbars */
  ::-webkit-scrollbar {
    display: none !important;
  }

  /* Generic hide */
  [data-visual-test="transparent"] {
    color: transparent !important;
    font-family: monospace !important;
    opacity: 0 !important;
  }

  [data-visual-test="removed"] {
    display: none !important;
  }
`;

// Check if the fonts are loaded
function waitForFontLoading() {
  return document.fonts.status === "loaded";
}

// Check if the images are loaded
function waitForImagesLoading() {
  const allImages = Array.from(document.images);
  allImages.forEach((img) => (img.loading = "eager"));
  return allImages.every((img) => img.complete);
}

// Disable spellcheck to avoid red underlines
function disableSpellCheck() {
  const query =
    "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";
  const inputs = document.querySelectorAll(query);
  inputs.forEach((input) => input.setAttribute("spellcheck", "false"));
  return true;
}

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

export async function argosScreenshot(
  page: Page,
  name: string,
  { element, has, hasText, ...options }: ArgosScreenshotOptions = {},
) {
  if (!page) throw new Error("A Playwright `page` object is required.");
  if (!name) throw new Error("The `name` argument is required.");

  const handle =
    typeof element === "string"
      ? page.locator(element, { has, hasText })
      : element ?? page;

  mkdir(screenshotFolder, { recursive: true });

  // Inject global styles
  await page.addStyleTag({ content: GLOBAL_STYLES });

  // Wait for all busy elements to be loaded
  await page.waitForSelector('[aria-busy="true"]', { state: "hidden" });

  // Code injection to improve the screenshot stability
  await Promise.all([
    page.waitForFunction(waitForImagesLoading),
    page.waitForFunction(waitForFontLoading),
    page.waitForFunction(disableSpellCheck),
  ]);

  await handle.screenshot({
    path: resolve(screenshotFolder, `${name}.png`),
    type: "png",
    fullPage: true,
    mask: [page.locator('[data-visual-test="blackout"]')],
    animations: "disabled",
    ...options,
  });
}
