import { browser, expect } from "@wdio/globals";
import sharp from "sharp";
import { argosScreenshot } from "../../src/index.js";

const url = new URL("../../fixtures/dummy.html", import.meta.url).href;
const helpersUrl = new URL("../../fixtures/helpers.html", import.meta.url).href;

/**
 * Read the color of some pixels of a screenshot.
 */
async function getPixels(
  screenshotName: string,
  points: { x: number; y: number }[],
) {
  const { data, info } = await sharp(`screenshots/argos/${screenshotName}.png`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return points.map(({ x, y }) => {
    const index = (y * info.width + x) * info.channels;
    return "#" + data.subarray(index, index + 3).toString("hex");
  });
}

const WHITE = "#ffffff";
const RED = "#ff0000";
const LIME = "#00ff00";
const CYAN = "#00ffff";
const BLACK = "#000000";
const PINK = "#ff00ff";

it("take a simple screenshot of the page", async () => {
  await browser.url(url);
  await argosScreenshot(browser, "simple");
});

describe("mask option", () => {
  it("mask some area of the images", async () => {
    await browser.url(url);
    await argosScreenshot(browser, "masks", {
      mask: [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 100, width: 100, height: 100 },
      ],
    });
  });
});

describe("with a name ending with `.png`", () => {
  it("allows to specify the full path", async () => {
    await browser.url(url);
    await argosScreenshot(browser, "screenshots/fullpath.png");
  });
});

// Each row of the helpers page is 50px high.
describe("helpers", () => {
  beforeEach(async () => {
    await browser.url(helpersUrl);
  });

  it("applies the `data-visual-test` helpers", async () => {
    await argosScreenshot(browser, "helpers-attributes");

    const pixels = await getPixels("helpers-attributes", [
      // `#hidden`
      { x: 10, y: 25 },
      // `#transparent`
      { x: 10, y: 125 },
      // `#blackout`
      { x: 10, y: 175 },
    ]);
    expect(pixels).toEqual([RED, WHITE, PINK]);

    // The page is restored after the screenshot.
    const state = await browser.execute(() => ({
      className: document.documentElement.className,
      opacity: getComputedStyle(document.getElementById("transparent")!)
        .opacity,
    }));
    expect(state).toEqual({ className: "", opacity: "1" });
  });

  it("hides and removes elements", async () => {
    await argosScreenshot(browser, "helpers-hide-remove", {
      hide: ["#hidden", "#masked", ".does-not-exist"],
      // Removing wins over hiding.
      remove: ["#removed", "#hidden"],
    });

    // Removed rows no longer take space, so the rows below them move up.
    const pixels = await getPixels("helpers-hide-remove", [
      // `#blackout`
      { x: 10, y: 75 },
      // `#masked` is hidden.
      { x: 10, y: 125 },
      // `#last`
      { x: 10, y: 175 },
    ]);
    expect(pixels).toEqual([PINK, WHITE, BLACK]);

    // The page is restored after the screenshot.
    const attributes = await browser.execute(() =>
      Array.from(document.querySelectorAll("div"), (div) =>
        div.getAttribute("data-visual-test"),
      ),
    );
    expect(attributes).toEqual([
      null,
      null,
      "transparent",
      "blackout",
      null,
      null,
    ]);
  });

  it("masks elements matched by selectors", async () => {
    await argosScreenshot(browser, "helpers-mask-selectors", {
      mask: [
        "#masked",
        ".does-not-exist",
        { x: 0, y: 0, width: 20, height: 20 },
      ],
      maskColor: LIME,
    });

    const pixels = await getPixels("helpers-mask-selectors", [
      // Rectangle
      { x: 10, y: 10 },
      // `#hidden`
      { x: 30, y: 25 },
      // `#blackout`
      { x: 10, y: 175 },
      // `#masked`
      { x: 10, y: 225 },
      // `#last`
      { x: 10, y: 275 },
    ]);
    expect(pixels).toEqual([LIME, RED, LIME, LIME, BLACK]);
  });

  it("masks elements of a scrolled page", async () => {
    await browser.execute(() => window.scrollTo(0, 100));
    await argosScreenshot(browser, "helpers-mask-scrolled", {
      mask: ["#masked"],
    });

    // The screenshot only captures the viewport.
    const pixels = await getPixels("helpers-mask-scrolled", [
      // `#blackout`
      { x: 10, y: 75 },
      // `#masked`
      { x: 10, y: 125 },
      // `#last`
      { x: 10, y: 175 },
    ]);
    expect(pixels).toEqual([PINK, PINK, BLACK]);
  });

  it("masks elements on high density screens", async () => {
    const viewport = await browser.execute(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));
    await browser.setViewport({ ...viewport, devicePixelRatio: 2 });
    try {
      await argosScreenshot(browser, "helpers-mask-dpr", {
        mask: ["#masked"],
      });
    } finally {
      await browser.setViewport(viewport);
    }

    const pixels = await getPixels("helpers-mask-dpr", [
      // `#blackout`
      { x: 20, y: 350 },
      // `#masked`
      { x: 20, y: 450 },
      // `#last`
      { x: 20, y: 550 },
    ]);
    expect(pixels).toEqual([PINK, PINK, BLACK]);
  });

  it("injects `argosCSS`", async () => {
    await argosScreenshot(browser, "helpers-argos-css", {
      argosCSS: "#hidden { background: cyan !important; }",
    });

    const pixels = await getPixels("helpers-argos-css", [{ x: 10, y: 25 }]);
    expect(pixels).toEqual([CYAN]);

    // The page is restored after the screenshot.
    const background = await browser.execute(
      () =>
        getComputedStyle(document.getElementById("hidden")!).backgroundColor,
    );
    expect(background).toBe("rgb(255, 0, 0)");
  });
});
