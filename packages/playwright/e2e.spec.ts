/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, chromium, expect, Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { argosScreenshot } from "./src/index.js";
// @ts-ignore
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";
import { checkIsUsingArgosReporter } from "./src/util.js";

test.describe.configure({ mode: "serial" });
const screenshotFolder = "screenshots";

export async function checkExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
}

async function expectScreenshotToExists(screenshotName: string) {
  const info = await test.info();
  // If we are using the Argos reporter, screenshots are not saved locally
  if (checkIsUsingArgosReporter(info)) return;
  const filepath = fileURLToPath(
    new URL(`${screenshotFolder}/${screenshotName}.png`, import.meta.url).href,
  );
  const exists = await checkExists(filepath);
  expect(exists).toBe(true);
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
    await expectScreenshotToExists(screenshotName);
  });

  test.describe("with fullPage option false", () => {
    test("does not take a screenshot of full page", async () => {
      await argosScreenshot(page, "full-page", { fullPage: false });
    });
  });

  test.describe("screenshot element", () => {
    test("takes a screenshot of an element", async () => {
      await argosScreenshot(page, "red-square", { element: ".red-square" });
    });
  });

  test.describe("viewports", () => {
    test("takes screenshots on different viewports", async () => {
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

  test.describe("with cjs version", () => {
    test("works", async () => {
      await argosScreenshotCjs(page, "full-page-cjs");
    });
  });
});
