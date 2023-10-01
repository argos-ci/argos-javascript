import "expect-puppeteer";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { argosScreenshot } from "./index.js";
import { argosScreenshot as argosScreenshotCjs } from "./index.cjs";

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
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
        (div) => div.innerHTML
      );
      expect(loaderContainer.trim()).toBe("");
    });

    it("hides div with data-visual-test='transparent'", async () => {
      const opacityStyle = await page.$eval(
        "div[data-visual-test='transparent']",
        (div) => getComputedStyle(div).opacity
      );
      expect(opacityStyle).toBe("0");
    });

    it("removes div with data-visual-test='removed'", async () => {
      const displayStyle = await page.$eval(
        "div[data-visual-test='removed']",
        (div) => getComputedStyle(div).display
      );
      expect(displayStyle).toBe("none");
    });

    it("takes a screenshot", async () => {
      const filepath = fileURLToPath(
        new URL("screenshots/argos/page.png", import.meta.url).href
      );
      expect(await exists(filepath)).toBe(true);
    });
  });

  describe("with fullPage option", () => {
    it("takes a screenshot of full page", async () => {
      await argosScreenshot(page, "full-page", { fullPage: true });
      const filepath = fileURLToPath(
        new URL("screenshots/argos/full-page.png", import.meta.url).href
      );
      expect(await exists(filepath)).toBe(true);
    });
  });

  describe("screenshot element", () => {
    it("takes a screenshot of an element", async () => {
      await argosScreenshot(page, "element", { element: ".red-square" });
      const filepath = fileURLToPath(
        new URL("screenshots/argos/element.png", import.meta.url).href
      );
      expect(await exists(filepath)).toBe(true);
    });
  });

  describe("with cjs version", () => {
    it("works", async () => {
      await argosScreenshotCjs(page, "full-page-cjs", { fullPage: true });
      const filepath = fileURLToPath(
        new URL("screenshots/argos/full-page-cjs.png", import.meta.url).href
      );
      expect(await exists(filepath)).toBe(true);
    });
  });
});
