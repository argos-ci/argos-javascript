import { resolve } from "node:path";
import mkdirp from "mkdirp";

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

/**
 * Check if there is `[aria-busy="true"]` element on the page.
 */
async function ensureNoBusy() {
  const checkIsVisible = (element) =>
    Boolean(
      element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
    );

  return [...document.querySelectorAll('[aria-busy="true"]')].every(
    (element) => !checkIsVisible(element)
  );
}

/**
 * Wait for all fonts to be loaded.
 */
function waitForFonts() {
  return document.fonts.status === "loaded";
}

/**
 * Wait for all images to be loaded.
 */
async function waitForImages() {
  return Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          })
      )
  );
}

/**
 *  Disable spellcheck to avoid red underlines
 */
function disableSpellCheck() {
  const query =
    "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";
  const inputs = document.querySelectorAll(query);
  inputs.forEach((input) => input.setAttribute("spellcheck", "false"));
  return true;
}

export async function argosScreenshot(
  page,
  name,
  { element = page, ...options } = {}
) {
  if (!page) throw new Error("A Puppeteer `page` object is required.");
  if (!name) throw new Error("The `name` argument is required.");

  if (typeof element === "string") {
    await page.waitForSelector(element);
    element = await page.$(element);
  }

  const directory = resolve(process.cwd(), "screenshots/argos");

  const [resolvedElement] = await Promise.all([
    (async () => {
      if (typeof element === "string") {
        await page.waitForSelector(element);
        return page.$(element);
      }
      return element;
    })(),
    mkdirp(directory),
    page.addStyleTag({ content: GLOBAL_STYLES }),
    page.waitForFunction(ensureNoBusy),
    page.waitForFunction(waitForFonts),
    page.waitForFunction(waitForImages),
    page.waitForFunction(disableSpellCheck),
  ]);

  await resolvedElement.screenshot({
    path: resolve(directory, `${name}.png`),
    type: "png",
    ...options,
  });
}
