import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";
import { argosScreenshot } from "./dist/index.mjs";
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";

export async function checkExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function expectScreenshotToExists(screenshotName) {
  const filepath = fileURLToPath(
    new URL(`screenshots/argos/${screenshotName}.png`, import.meta.url).href,
  );
  const exists = await checkExists(filepath);
  expect(exists).toBe(true);
}

describe("argosScreenshot", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.goto(new URL("fixtures/dummy.html", import.meta.url).href, {
      waitUntil: "networkidle2",
    });
  }, 30000);

  afterAll(async () => {
    await browser.close();
  });

  describe("without page", () => {
    it("throws an error", async () => {
      expect.assertions(1);
      try {
        await argosScreenshot();
      } catch (error) {
        expect(error.message).toBe("A Puppeteer `page` object is required.");
      }
    });
  });

  describe("without name", () => {
    it("throws an error", async () => {
      expect.assertions(1);
      try {
        await argosScreenshot(page);
      } catch (error) {
        expect(error.message).toBe("The `name` argument is required.");
      }
    });
  });

  describe("screenshot page", () => {
    beforeAll(async () => {
      await argosScreenshot(page, "page");
    });

    it("waits for loader hiding", async () => {
      const loaderContainer = await page.$eval(
        "#loader-container",
        (div) => div.innerHTML,
      );
      expect(loaderContainer.trim()).toBe("");
    });

    it("takes a screenshot", async () => {
      await expectScreenshotToExists("page");
    });
  });

  describe("with fullPage option false", () => {
    it("does not take a screenshot of full page", async () => {
      await argosScreenshot(page, "full-page", { fullPage: false });
    });
  });

  describe("screenshot element", () => {
    it("takes a screenshot of an element", async () => {
      await argosScreenshot(page, "element", { element: ".red-square" });
    });
  });

  describe("viewports", () => {
    it("takes screenshots on different viewports", async () => {
      await argosScreenshot(page, "viewport", {
        viewports: [
          "iphone-4",
          "macbook-15",
          {
            preset: "ipad-2",
            orientation: "landscape",
          },
          { width: 800, height: 600 },
        ],
        fullPage: false,
      });

      await Promise.all([
        expectScreenshotToExists(`viewport vw-320`),
        expectScreenshotToExists(`viewport vw-800`),
        expectScreenshotToExists(`viewport vw-1024`),
        expectScreenshotToExists(`viewport vw-1440`),
      ]);
    });
  });

  it("supports argosCSS option", async () => {
    await argosScreenshot(page, "argosCSS-option", {
      argosCSS: "body { background: blue; }",
    });
  });

  it("supports threshold option", async () => {
    await argosScreenshot(page, "threshold-option", {
      threshold: 0.3,
    });
  });

  it("supports tags option", async () => {
    await argosScreenshot(page, "tags-option", {
      tag: ["snapshot-tag"],
    });
  });

  /**
   * Read the color of some pixels of a screenshot, decoded by the browser.
   */
  async function getPixels(screenshotName, points) {
    const data = await readFile(
      new URL(`screenshots/argos/${screenshotName}.png`, import.meta.url),
      "base64",
    );
    return page.evaluate(
      async (data, points) => {
        // Runs in the browser.
        const { document, Image } = globalThis;
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return points.map(({ x, y }) => {
          const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
          return { r, g, b };
        });
      },
      data,
      points,
    );
  }

  const WHITE = { r: 255, g: 255, b: 255 };
  const BLACK = { r: 0, g: 0, b: 0 };
  const BLUE = { r: 0, g: 0, b: 255 };
  const RED = { r: 255, g: 0, b: 0 };
  const MAGENTA = { r: 255, g: 0, b: 255 };
  const CYAN = { r: 0, g: 255, b: 255 };

  describe("with hide and remove options", () => {
    beforeAll(async () => {
      await page.goto(new URL("fixtures/helpers.html", import.meta.url).href);
    });

    it("hides and removes elements", async () => {
      await argosScreenshot(page, "helpers", {
        fullPage: false,
        hide: ["#hidden", ".does-not-exist", await page.$("#handle")],
        // Removing wins over hiding.
        remove: ["#removed", "#blackout", "#hidden"],
      });

      // Each row is 50px high: removed rows no longer take space, so the rows
      // below them move up.
      const pixels = await getPixels("helpers", [
        // `#handle` is hidden.
        { x: 10, y: 25 },
        // `#last`.
        { x: 10, y: 75 },
      ]);
      expect(pixels).toEqual([WHITE, BLACK]);

      // The page is restored after the screenshot.
      const attributes = await page.$$eval("div", (divs) =>
        divs.map((div) => div.getAttribute("data-visual-test")),
      );
      expect(attributes).toEqual([null, null, null, "blackout", null]);
    });
  });

  describe("with mask option", () => {
    beforeAll(async () => {
      await page.goto(new URL("fixtures/helpers.html", import.meta.url).href);
    });

    it("masks the blackout helper and the given elements", async () => {
      await argosScreenshot(page, "mask", {
        fullPage: false,
        mask: ["#hidden", ".does-not-exist", await page.$("#handle")],
      });

      // Each row is 50px high.
      const pixels = await getPixels("mask", [
        // `#hidden`, masked.
        { x: 10, y: 0 },
        { x: 10, y: 49 },
        // `#removed`, not masked.
        { x: 10, y: 50 },
        { x: 10, y: 99 },
        // `#handle`, masked.
        { x: 10, y: 100 },
        // `#blackout`, masked by the helper.
        { x: 10, y: 199 },
        // `#last`, not masked.
        { x: 10, y: 200 },
      ]);
      expect(pixels).toEqual([
        MAGENTA,
        MAGENTA,
        BLUE,
        BLUE,
        MAGENTA,
        MAGENTA,
        BLACK,
      ]);

      // The page is restored after the screenshot.
      expect(await page.$("argos-mask")).toBe(null);
    });

    it("supports maskColor option", async () => {
      await argosScreenshot(page, "mask-color", {
        fullPage: false,
        maskColor: "#00FFFF",
      });

      const pixels = await getPixels("mask-color", [{ x: 10, y: 175 }]);
      expect(pixels).toEqual([CYAN]);
    });

    describe("on a long page", () => {
      beforeAll(async () => {
        await page.goto(new URL("fixtures/mask.html", import.meta.url).href);
      });

      it("masks elements below the fold in a full page screenshot", async () => {
        // The boxes follow the elements whatever the scroll position.
        await page.evaluate(() => globalThis.scrollTo(0, 1000));
        await argosScreenshot(page, "mask-full-page");

        // `#container` starts at 2100px, `#masked` is inside its 20px padding.
        const pixels = await getPixels("mask-full-page", [
          { x: 10, y: 50 },
          { x: 10, y: 2110 },
          { x: 100, y: 2120 },
          { x: 100, y: 2169 },
          { x: 100, y: 2175 },
        ]);
        expect(pixels).toEqual([RED, BLUE, MAGENTA, MAGENTA, BLUE]);
      });

      it("masks elements in an element screenshot", async () => {
        // Puppeteer scrolls the element into view before taking the screenshot.
        await page.evaluate(() => globalThis.scrollTo(0, 0));
        await argosScreenshot(page, "mask-element", { element: "#container" });

        const pixels = await getPixels("mask-element", [
          { x: 10, y: 10 },
          { x: 100, y: 20 },
          { x: 100, y: 69 },
          { x: 100, y: 75 },
        ]);
        expect(pixels).toEqual([BLUE, MAGENTA, MAGENTA, BLUE]);
      });

      it("masks elements in a modal dialog", async () => {
        await page.$eval("#dialog", (dialog) => dialog.showModal());
        const { x, y } = await page.$eval("#in-dialog", (element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        await argosScreenshot(page, "mask-dialog", { fullPage: false });
        await page.$eval("#dialog", (dialog) => dialog.close());

        const pixels = await getPixels("mask-dialog", [
          { x: Math.round(x), y: Math.round(y) },
        ]);
        expect(pixels).toEqual([MAGENTA]);
      });
    });
  });

  describe("with cjs version", () => {
    it("works", async () => {
      await argosScreenshotCjs(page, "cjs");
    });
  });
});
