import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { argosScreenshot } from "./dist/index";
import { argosScreenshot as typedArgosScreenshot } from "./src";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";

test.describe.configure({ mode: "serial" });
const screenshotFolder = "screenshots";

export async function checkExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function expectScreenshotToExists(screenshotName: string) {
  const info = await test.info();
  // If we are using the Argos reporter, screenshots are not saved locally
  if (info.config.reporter.some((rep) => rep[0].includes("argos"))) {
    return;
  }
  const filepath = fileURLToPath(
    new URL(`${screenshotFolder}/${screenshotName}.png`, import.meta.url).href,
  );
  const exists = await checkExists(filepath);
  expect(exists).toBe(true);
}

const url = new URL("fixtures/dummy.html", import.meta.url).href;
test.describe("#argosScreenshot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test("throws without page", async () => {
    let error: any;
    try {
      // @ts-expect-error - We want to test the error
      await typedArgosScreenshot();
    } catch (e: any) {
      error = e;
    }
    expect(error.message).toBe("A Playwright `page` object is required.");
  });

  test("throws without name", async ({ page }) => {
    let error: any;
    try {
      // @ts-expect-error - We want to test the error
      await typedArgosScreenshot(page);
    } catch (e: any) {
      error = e;
    }
    expect(error.message).toBe("The `name` argument is required.");
  });

  test.describe("with `fullPage` set to false", () => {
    test("does not take a screenshot of full page", async ({ page }) => {
      await page.getByTestId("hoverable").hover();
      await argosScreenshot(page, "full-page", {
        fullPage: false,
        disableHover: false,
      });
      await expectScreenshotToExists("full-page");
      // Check that the loader is not visible
      // because we should wait for it to disappear in `argosScreenshot`
      const loaderContainer = await page.$eval(
        "#loader-container",
        (div) => div.innerHTML,
      );
      expect(loaderContainer.trim()).toBe("");
    });
  });

  test.describe("with `disabledHover` set to false", () => {
    test("it does not disable hover", async ({ page }) => {
      await page.getByTestId("hoverable").hover();
      await argosScreenshot(page, "with-hover", {
        fullPage: false,
        disableHover: false,
      });
    });
  });

  test.describe("screenshot element", () => {
    test("takes a screenshot of an element", async ({ page }) => {
      await argosScreenshot(page, "red-square", { element: ".red-square" });
    });
  });

  test.describe("viewports", () => {
    test("takes screenshots on different viewports", async ({ page }) => {
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

  test.describe("with argosCSS", () => {
    test("works", async ({ page }) => {
      await argosScreenshot(page, "argosCSS-option", {
        argosCSS: "body { background: blue; }",
      });
    });
  });

  test.describe("with custom threshold", () => {
    test("works", async ({ page }) => {
      await argosScreenshot(page, "threshold-option", {
        threshold: 0.2,
      });
    });
  });

  test.describe("with cjs version", () => {
    test("works", async ({ page }) => {
      await argosScreenshotCjs(page, "full-page-cjs");
    });
  });
});
