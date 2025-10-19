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
import { argosAriaSnapshot } from "./dist/index";

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

async function expectSnapshotToExists(
  screenshotName: string,
  type: "screenshot" | "aria" = "screenshot",
) {
  const info = await test.info();
  // If we are using the Argos reporter, screenshots are not saved locally
  if (info.config.reporter.some((rep) => rep[0].includes("argos"))) {
    return;
  }
  const extension = { screenshot: "png", aria: ".aria.yml" }[type];
  const filepath = fileURLToPath(
    new URL(
      `${screenshotFolder}/${screenshotName}.${extension}`,
      import.meta.url,
    ).href,
  );
  const exists = await checkExists(filepath);
  expect(exists).toBe(true);
}

const url = new URL("fixtures/dummy.html", import.meta.url).href;

test.describe("#argosScreenshot", () => {
  test.beforeEach(async ({ page, context }) => {
    // Delay the font loading to test the stabilization plugin.
    context.route(/fonts\.gstatic\.com/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    // Visit the page
    await page.goto(url);
  });

  test.describe("API", () => {
    test("throws without page", async () => {
      let error: any;
      try {
        // @ts-expect-error - We want to test the error
        await typedArgosScreenshot();
      } catch (e: any) {
        error = e;
      }
      expect(error.message).toBe("A Playwright `handler` object is required.");
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
  });

  test.describe("without any option", () => {
    test("takes a screenshot", async ({ page }) => {
      // Test hovering stabilization
      await page.getByTestId("hoverable").hover();

      await argosScreenshot(page, "default");
      await expectSnapshotToExists("default");

      // Check that the loader is not visible
      // because we should wait for it to disappear in `argosScreenshot`
      const loaderContainer = await page.$eval(
        "#loader-container",
        (div) => div.innerHTML,
      );
      expect(loaderContainer.trim()).toBe("");
    });
  });

  test.describe(
    "with annotations",
    {
      annotation: {
        type: "info",
        description: "This is an annotation",
      },
    },
    () => {
      test("takes a screenshot", async ({ page }) => {
        await argosScreenshot(page, "with-annotation");
      });
    },
  );

  test.describe("with cjs version", () => {
    test("takes a screenshot", async ({ page }) => {
      await argosScreenshotCjs(page, "basic-cjs");
      await expectSnapshotToExists("basic-cjs");
    });
  });

  test.describe("with `fullPage` set to false", () => {
    test("does not take a screenshot of full page", async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await argosScreenshot(page, "partial-page", { fullPage: false });
      await expectSnapshotToExists("partial-page");
    });
  });

  test.describe("with `disabledHover` set to false", () => {
    test("it does not disable hover", async ({ page }) => {
      // Test hovering stabilization
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
      });

      await Promise.all([
        expectSnapshotToExists("viewport vw-320"),
        expectSnapshotToExists("viewport vw-800"),
        expectSnapshotToExists("viewport vw-1024"),
        expectSnapshotToExists("viewport vw-1440"),
      ]);
    });
  });

  test.describe("with argosCSS", () => {
    test("evaluate custom CSS", async ({ page }) => {
      await argosScreenshot(page, "custom-css", {
        argosCSS: "body { background: blue; }",
      });
    });
  });

  test.describe("with custom threshold", () => {
    test("takes a screenshot with the threshold option", async ({ page }) => {
      await argosScreenshot(page, "threshold-option", {
        threshold: 0.2,
      });
    });
  });
});

test.describe("#argosAriaSnapshot", () => {
  test("takes a an aria snapshot with the screenshot", async ({ page }) => {
    await page.goto(url);
    await argosScreenshot(page, "with-aria-snapshot", {
      ariaSnapshot: true,
    });
    await expectSnapshotToExists("with-aria-snapshot", "screenshot");
    await expectSnapshotToExists("with-aria-snapshot", "aria");
  });

  test("takes a an aria snapshot with the screenshot by viewport", async ({
    page,
  }) => {
    await page.goto(url);
    await argosScreenshot(page, "with-aria-snapshot-viewport", {
      ariaSnapshot: true,
      viewports: ["iphone-4", "macbook-16"],
    });
  });

  test("takes a an aria snapshot of the page", async ({ page }) => {
    await page.goto(url);
    await argosAriaSnapshot(page, "body-aria-snapshot");
    await expectSnapshotToExists("body-aria-snapshot", "aria");
  });

  test("takes a an aria snapshot of the transparent section", async ({
    page,
  }) => {
    await page.goto(url);
    await argosAriaSnapshot(page, "section-aria-snapshot", {
      element: "#transparent-section",
    });
    await expectSnapshotToExists("section-aria-snapshot", "aria");
  });
});
