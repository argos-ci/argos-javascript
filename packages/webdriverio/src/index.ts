import sharp from "sharp";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  type ArgosGlobal,
  getGlobalScript,
  type StabilizationContext,
} from "@argos-ci/browser";

type Size = { width: number; height: number };
type Coords = { x: number; y: number; width: number; height: number };

/**
 * Elements with this attribute are always masked.
 */
const BLACKOUT_SELECTOR = '[data-visual-test="blackout"]';

/**
 * Clip an area to the image, on whole pixels.
 * Returns `null` when the area is outside of the image.
 */
function clipArea(area: Coords, dimensions: Size): Coords | null {
  const left = Math.max(0, Math.floor(area.x));
  const top = Math.max(0, Math.floor(area.y));
  const right = Math.min(dimensions.width, Math.ceil(area.x + area.width));
  const bottom = Math.min(dimensions.height, Math.ceil(area.y + area.height));
  if (right <= left || bottom <= top) {
    return null;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Overlay areas of the screenshot with the mask color.
 */
async function maskScreenshot(
  image: Buffer,
  areas: Coords[],
  maskColor: string,
) {
  try {
    const screenshot = sharp(image);
    const dimensions = await screenshot.metadata();
    return await screenshot
      .composite(
        areas
          // Sharp can't composite an image larger than the screenshot.
          .map((area) => clipArea(area, dimensions))
          .filter((coords) => coords !== null)
          .map((coords) => ({
            input: Buffer.from(
              '<svg><rect x="0" y="0" width="' +
                coords.width +
                '" height="' +
                coords.height +
                `" fill="${maskColor}"/></svg>`,
            ),
            top: coords.y,
            left: coords.x,
          })),
      )
      .png()
      .toBuffer();
  } catch (err) {
    throw new Error("Error applying mask", { cause: err });
  }
}

async function getScreenshotPath(name: string) {
  if (name.endsWith(".png")) {
    return name;
  }

  const screenshotFolder = resolve(process.cwd(), "screenshots/argos");
  await mkdir(screenshotFolder, { recursive: true });
  return resolve(screenshotFolder, name + ".png");
}

export type ArgosScreenshotOptions = {
  /**
   * Areas to mask when the screenshot is taken, as rectangles in pixels of the
   * screenshot or as WebdriverIO selectors of the elements to mask.
   * Masked areas are overlaid with a pink box #FF00FF (customized by `maskColor`).
   * Elements with the `data-visual-test="blackout"` attribute are always masked.
   * Selectors that match nothing are ignored.
   * @example
   *    argosScreenshot(browser, "home", {
   *      mask: ["#clock", { x: 0, y: 0, width: 100, height: 100 }],
   *    })
   */
  mask?: (string | Coords)[];

  /**
   * Specify the color of the overlay box for masked elements, in CSS color format.
   * Default color is pink #FF00FF.
   * @default "#FF00FF"
   */
  maskColor?: string;

  /**
   * WebdriverIO selectors of the elements to hide from the screenshot.
   * Hidden elements keep their space in the layout, like with the
   * `data-visual-test="transparent"` helper.
   * Selectors that match nothing are ignored.
   * @example
   *    argosScreenshot(browser, "home", { hide: ["#clock", ".avatar"] })
   */
  hide?: string[];

  /**
   * WebdriverIO selectors of the elements to remove from the screenshot.
   * Removed elements no longer take space in the layout, like with the
   * `data-visual-test="removed"` helper.
   * Selectors that match nothing are ignored.
   * @example
   *    argosScreenshot(browser, "home", { remove: [".cookie-banner"] })
   */
  remove?: string[];

  /**
   * Custom CSS evaluated during the screenshot process.
   */
  argosCSS?: string;
};

/**
 * Find the elements matched by WebdriverIO selectors.
 */
async function findElements(
  browser: WebdriverIO.Browser,
  selectors: string[] = [],
) {
  const results = await Promise.all(
    selectors.map((selector) => browser.$$(selector)),
  );
  return results.flatMap((elements) => [...elements]);
}

/**
 * Inject Argos script into the page.
 * Checked in the page, to save a round trip to the browser.
 */
async function injectArgos(browser: WebdriverIO.Browser) {
  await browser.execute(
    `if (typeof window.__ARGOS__ === "undefined") {\n${getGlobalScript()}\n}`,
  );
}

/**
 * Prepare the page for the screenshot: add the `__argos__` class, inject
 * `argosCSS`, enable the `data-visual-test` helpers and apply the `hide` and
 * `remove` options. The stabilization plugins are not run.
 * Returns a function restoring the page.
 */
async function setup(
  browser: WebdriverIO.Browser,
  options: ArgosScreenshotOptions,
) {
  const context: StabilizationContext = {
    argosCSS: options.argosCSS,
    options: false,
  };

  const [, hidden, removed] = await Promise.all([
    injectArgos(browser),
    findElements(browser, options.hide),
    findElements(browser, options.remove),
  ]);

  await browser.execute(
    (context, hiddenCount, ...elements) => {
      const argos = (window as any).__ARGOS__ as ArgosGlobal;
      argos.beforeAll(context);
      argos.applyHelper(elements.slice(0, hiddenCount), "transparent");
      argos.applyHelper(elements.slice(hiddenCount), "removed");
      argos.beforeEach(context);
    },
    context,
    hidden.length,
    ...hidden,
    ...removed,
  );

  return async () => {
    await browser.execute(() => {
      const argos = (window as any).__ARGOS__ as ArgosGlobal;
      argos.afterEach();
      argos.afterAll();
    });
  };
}

/**
 * Check if the session drives a native mobile app, where no script can run.
 */
async function checkIsNativeContext(browser: WebdriverIO.Browser) {
  if (!browser.isMobile) {
    return false;
  }
  // `isNativeContext` is only available from WebdriverIO 9.
  if (typeof browser.isNativeContext === "boolean") {
    return browser.isNativeContext;
  }
  return (await browser.getContext()) === "NATIVE_APP";
}

/**
 * Get the areas covered by the elements to mask, in pixels of the screenshot.
 * The screenshot only captures the viewport.
 */
async function getMaskedElementsAreas(
  browser: WebdriverIO.Browser,
  selectors: string[],
): Promise<Coords[]> {
  const elements = await findElements(browser, selectors);
  if (elements.length === 0) {
    return [];
  }
  return browser.execute(
    (...elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const ratio = window.devicePixelRatio;
        return {
          x: rect.x * ratio,
          y: rect.y * ratio,
          width: rect.width * ratio,
          height: rect.height * ratio,
        };
      }),
    ...elements,
  );
}

/**
 * Take a screenshot of the current page, optionally hiding, removing or
 * masking some elements.
 * The `data-visual-test` helper attributes are applied.
 *
 * @example
 *    argosScreenshot(browser, "my-screenshot")
 * @see https://argos-ci.com/docs/reference/webdriverio
 */
export async function argosScreenshot(
  /**
   * WebdriverIO `browser` object.
   */
  browser: WebdriverIO.Browser,
  /**
   * Name of the screenshot or full path to the screenshot.
   */
  name: string,
  /**
   * Options for the screenshot.
   */
  options: ArgosScreenshotOptions = {},
) {
  const { mask = [], maskColor = "#FF00FF" } = options;

  if (!browser) {
    throw new Error("A WebdriverIO `browser` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const selectorMasks = mask.filter((area) => typeof area === "string");

  // A native app has no page to run the Argos script in: capture it as is.
  const isNativeContext = await checkIsNativeContext(browser);
  if (
    isNativeContext &&
    (options.hide ||
      options.remove ||
      options.argosCSS ||
      selectorMasks.length > 0)
  ) {
    throw new Error(
      "The `hide`, `remove` and `argosCSS` options and selectors in `mask` are not supported in a native app context.",
    );
  }
  const teardown = isNativeContext ? null : await setup(browser, options);

  // Measured once the elements are hidden or removed, as the layout may change.
  const maskedElementsAreas = isNativeContext
    ? []
    : await getMaskedElementsAreas(browser, [
        BLACKOUT_SELECTOR,
        ...selectorMasks,
      ]);
  const areas = [
    ...mask.filter((area) => typeof area !== "string"),
    ...maskedElementsAreas,
  ];

  const screenshotPath = await getScreenshotPath(name);
  const imageBuffer = await browser.saveScreenshot(screenshotPath);

  if (areas.length === 0) {
    await teardown?.();
    return imageBuffer;
  }

  // Restore the page while masking the screenshot.
  const [maskedBuffer] = await Promise.all([
    maskScreenshot(imageBuffer, areas, maskColor),
    teardown?.(),
  ]);
  await writeFile(screenshotPath, maskedBuffer);
  return maskedBuffer;
}
