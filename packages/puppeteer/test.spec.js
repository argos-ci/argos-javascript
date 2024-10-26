import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { argosScreenshot } from "./dist/index.js";
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";

export async function checkExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
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

  describe("with cjs version", () => {
    it("works", async () => {
      await argosScreenshotCjs(page, "cjs");
    });
  });
});
