/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, chromium, expect, Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { argosScreenshot } from "./src/index.js";
// @ts-ignore
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";

test.describe.configure({ mode: "serial" });
const screenshotFolder = "screenshots";

export async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
}

async function screenshotExists(screenshotName: string) {
  const filepath = fileURLToPath(
    new URL(`${screenshotFolder}/${screenshotName}.png`, import.meta.url).href,
  );
  return exists(filepath);
}

const url = new URL("fixtures/dummy.html", import.meta.url).href;
test.describe("#argosScreenshot", () => {
  let page: Page;
  const screenshotName = "dummy-page";

  test.beforeAll(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    const client = await page.context().newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (0.4 * 1024 * 1024) / 8,
      uploadThroughput: (0.4 * 1024 * 1024) / 8,
      latency: 70,
    });
    page.on("console", (msg) => console.log(msg.text()));
    await page.goto(url);
    await argosScreenshot(page, screenshotName, {});
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("throws without page", async () => {
    let error: any;
    try {
      // @ts-expect-error - We want to test the error
      await argosScreenshot();
    } catch (e: any) {
      error = e;
    }
    expect(error.message).toBe("A Playwright `page` object is required.");
  });

  test("throws without name", async () => {
    let error: any;
    try {
      // @ts-expect-error - We want to test the error
      await argosScreenshot(page);
    } catch (e: any) {
      error = e;
    }
    expect(error.message).toBe("The `name` argument is required.");
  });

  test("waits for loader hiding", async () => {
    const loaderContainer = await page.$eval(
      "#loader-container",
      (div) => div.innerHTML,
    );
    expect(loaderContainer.trim()).toBe("");
  });

  test("waits for image loading", async () => {
    const loaderContainer = await page.$eval("#image", (div) => div.innerHTML);
    expect(loaderContainer.trim()).toBe("");
  });

  test("hides div with data-visual-test='transparent'", async () => {
    const opacityStyle = await page.$eval(
      "div[data-visual-test='transparent']",
      (div) => getComputedStyle(div).opacity,
    );
    expect(opacityStyle).toBe("0");
  });

  test("removes div with data-visual-test='removed'", async () => {
    const displayStyle = await page.$eval(
      "div[data-visual-test='removed']",
      (div) => getComputedStyle(div).display,
    );
    expect(displayStyle).toBe("none");
  });

  test("takes a screenshot", async () => {
    expect(screenshotExists(screenshotName)).toBeTruthy();
  });

  test.describe("with fullPage option", () => {
    test("takes a screenshot of full page", async () => {
      const screenshotName = "full-page";
      await argosScreenshot(page, screenshotName, { fullPage: true });
      expect(screenshotExists(screenshotName)).toBeTruthy();
    });
  });

  test.describe("screenshot element", () => {
    test("takes a screenshot of an element", async () => {
      const screenshotName = "red-square";
      await argosScreenshot(page, screenshotName, { element: ".red-square" });
      expect(screenshotExists(screenshotName)).toBeTruthy();
    });
  });

  test.describe("with cjs version", () => {
    test("works", async () => {
      const screenshotName = "full-page-cjs";
      await argosScreenshotCjs(page, screenshotName, { fullPage: true });
      expect(screenshotExists(screenshotName)).toBeTruthy();
    });
  });
});
