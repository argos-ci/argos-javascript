import { test, expect, type BrowserContext } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { argosScreenshot } from "./dist/index.mjs";
import { argosScreenshot as typedArgosScreenshot } from "./src";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { argosScreenshot as argosScreenshotCjs } from "./dist/index.cjs";
import { argosAriaSnapshot } from "./dist/index.mjs";

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

/**
 * Resolve the URL of a fixture. Each test uses a focused fixture that contains
 * only the markup it needs, so tests stay isolated from one another.
 */
function fixture(name: string) {
  return new URL(`fixtures/${name}`, import.meta.url).href;
}

/**
 * Delay Google Font loading so the `waitForFonts` stabilizer is exercised.
 */
async function delayFonts(context: BrowserContext) {
  await context.route(/fonts\.gstatic\.com/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
}

test.describe("#argosScreenshot", () => {
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
    test.beforeEach(async ({ page, context }) => {
      await delayFonts(context);
      await page.goto(fixture("loader.html"));
    });

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
        await page.goto(fixture("basic.html"));
        await argosScreenshot(page, "with-annotation");
      });
    },
  );

  test.describe("with cjs version", () => {
    test("takes a screenshot", async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await argosScreenshotCjs(page, "basic-cjs");
      await expectSnapshotToExists("basic-cjs");
    });
  });

  test.describe("with `fullPage` set to false", () => {
    test("does not take a screenshot of full page", async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await page.evaluate(() => window.scrollTo(0, 0));
      await argosScreenshot(page, "partial-page", { fullPage: false });
      await expectSnapshotToExists("partial-page");
    });
  });

  test.describe("with `disabledHover` set to false", () => {
    test("it does not disable hover", async ({ page }) => {
      await page.goto(fixture("hover.html"));
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
      await page.goto(fixture("element.html"));
      await argosScreenshot(page, "red-square", { element: ".red-square" });
    });
  });

  test.describe("viewports", () => {
    test("takes screenshots on different viewports", async ({ page }) => {
      await page.goto(fixture("basic.html"));
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

  test.describe("with `waitForBackgroundImages`", () => {
    // A 1x1 transparent PNG, served by the route below.
    const PNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );

    test("waits for background images to load before screenshotting", async ({
      page,
      context,
    }) => {
      await delayFonts(context);

      // Gate the background image request so we control exactly when it loads.
      let releaseImage = () => {};
      const imageGate = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      let imageRequested = () => {};
      const imageRequestedPromise = new Promise<void>((resolve) => {
        imageRequested = resolve;
      });

      await context.route(/slow-background\.png/, async (route) => {
        imageRequested();
        await imageGate;
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: PNG,
        });
      });

      // `domcontentloaded` so navigation doesn't wait for the gated image.
      await page.goto(fixture("background-image.html"), {
        waitUntil: "domcontentloaded",
      });

      let resolved = false;
      const screenshotPromise = argosScreenshot(page, "background-images", {
        fullPage: false,
        stabilize: { waitForBackgroundImages: true },
      })
        .then(() => {
          resolved = true;
        })
        .catch(() => {
          // Swallow so a failure surfaces through the assertions below.
        });

      // The plugin must have triggered the background image request…
      await imageRequestedPromise;
      // …and stabilization must still be blocked on it (well past the other
      // stabilizers: the 1000ms loader and the 500ms delayed fonts).
      await page.waitForTimeout(2000);
      expect(resolved).toBe(false);

      // Once the image loads, stabilization completes.
      releaseImage();
      await screenshotPromise;
      expect(resolved).toBe(true);
    });

    test("does not wait for background images by default", async ({
      page,
      context,
    }) => {
      await delayFonts(context);

      // Gate the image and never release it: default stabilization must still
      // complete, proving it does not block on background images.
      let releaseImage = () => {};
      const imageGate = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      await context.route(/slow-background\.png/, async (route) => {
        await imageGate;
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: PNG,
        });
      });

      await page.goto(fixture("background-image.html"), {
        waitUntil: "domcontentloaded",
      });

      // `#background-image` is not flagged with `data-visual-test-wait-bg-img`,
      // so the default scan ignores it and stabilization resolves even though
      // the image is stuck.
      await argosScreenshot(page, "background-images-disabled", {
        fullPage: false,
      });

      // Release the still-pending request to avoid leaking it.
      releaseImage();
    });

    test("waits for flagged background images by default", async ({
      page,
      context,
    }) => {
      await delayFonts(context);

      // Gate the flagged element's background image so we control when it loads.
      let releaseImage = () => {};
      const imageGate = new Promise<void>((resolve) => {
        releaseImage = resolve;
      });
      let imageRequested = () => {};
      const imageRequestedPromise = new Promise<void>((resolve) => {
        imageRequested = resolve;
      });

      await context.route(/flagged-background\.png/, async (route) => {
        imageRequested();
        await imageGate;
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: PNG,
        });
      });

      await page.goto(fixture("background-image.html"), {
        waitUntil: "domcontentloaded",
      });

      let resolved = false;
      // No `waitForBackgroundImages` option: the attribute alone opts the
      // element in.
      const screenshotPromise = argosScreenshot(
        page,
        "background-images-flagged",
        {
          fullPage: false,
        },
      )
        .then(() => {
          resolved = true;
        })
        .catch(() => {
          // Swallow so a failure surfaces through the assertions below.
        });

      // The plugin must have triggered the flagged image request…
      await imageRequestedPromise;
      // …and stabilization must still be blocked on it (well past the other
      // stabilizers: the 1000ms loader and the 500ms delayed fonts).
      await page.waitForTimeout(2000);
      expect(resolved).toBe(false);

      // Once the image loads, stabilization completes.
      releaseImage();
      await screenshotPromise;
      expect(resolved).toBe(true);
    });
  });

  test.describe("with `pauseGifs`", () => {
    // The 2-frame animated GIF (frame 0 red, frame 1 lime) from the fixture,
    // served from an extension-less URL so only `data-image-type="gif"` can
    // flag it.
    const GIF = Buffer.from(
      "R0lGODlhZABkAPAAAP8AAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAZABkAAACc4SPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2Oz+v3/L7/DxgoOEhYaHiImKi4yNjo+AhpWAAAIfkEABQAAAAsAAAAAGQAZACAAP8AAAAAAnOEj6nL7Q+jnLTai7PevPsPhuJIluaJpurKtu4Lx/JM1/aN5/rO9/4PDAqHxKLxiEwql8ym8wmNSqfUqvWKzWq33K73Cw6Lx+Sy+YxOq9fstvsNj8vn9Lr9js/r9/y+/w8YKDhIWGh4iJiouMjY6PgIaVgAADs=",
      "base64",
    );

    test.beforeEach(async ({ page, context }) => {
      await context.route(/masked-gif-endpoint/, (route) =>
        route.fulfill({ status: 200, contentType: "image/gif", body: GIF }),
      );
      await page.goto(fixture("gif.html"));
    });

    test("pauses animated GIFs on their first frame", async ({ page }) => {
      const gif = page.locator("#gif");

      // The fixture ships a 2-frame animated GIF (frame 0 red, frame 1 lime).
      const originalSrc = await gif.getAttribute("src");
      expect(originalSrc).toMatch(/^data:image\/gif/);

      // Inject the Argos global (as `argosScreenshot` does) so we can drive the
      // stabilization phases directly and observe the paused state — the normal
      // screenshot flow restores it immediately after capturing.
      await argosScreenshot(page, "with-gif", { fullPage: false });

      // Run the stabilization `beforeEach` phase, which pauses the GIF, then
      // wait until every GIF has finished being frozen.
      await page.evaluate(() => (window as any).__ARGOS__.beforeEach({}));
      await page.waitForFunction(() => (window as any).__ARGOS__.waitFor({}));
      await page.waitForFunction(() => {
        const img = document.getElementById("gif") as HTMLImageElement;
        return (
          img.src.startsWith("data:image/png") &&
          img.complete &&
          img.naturalWidth > 0
        );
      });

      // The animated GIF is now a static PNG snapshot.
      const frozenSrc = await gif.getAttribute("src");
      expect(frozenSrc).toMatch(/^data:image\/png/);

      // …and it is frozen on the first frame, which is red.
      const pixel = await gif.evaluate((img: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const {
          data: [r, g, b],
        } = ctx.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
        );
        return { r, g, b };
      });
      expect(pixel).toEqual({ r: 255, g: 0, b: 0 });

      // Cleanup restores the original animated GIF.
      await page.evaluate(() => (window as any).__ARGOS__.afterEach());
      expect(await gif.getAttribute("src")).toBe(originalSrc);
    });

    test('pauses GIFs flagged with `data-image-type="gif"`', async ({
      page,
    }) => {
      const gif = page.locator("#masked-gif");

      // The URL has no `.gif` extension, so only the attribute can flag it.
      expect(await gif.getAttribute("src")).toBe("masked-gif-endpoint");

      await argosScreenshot(page, "with-masked-gif", { fullPage: false });

      await page.evaluate(() => (window as any).__ARGOS__.beforeEach({}));
      await page.waitForFunction(() => (window as any).__ARGOS__.waitFor({}));
      await page.waitForFunction(() => {
        const img = document.getElementById("masked-gif") as HTMLImageElement;
        return img.src.startsWith("data:image/png") && img.complete;
      });

      // The animated GIF is now a static PNG snapshot, frozen on the red frame.
      expect(await gif.getAttribute("src")).toMatch(/^data:image\/png/);

      // Cleanup restores the original GIF (as a resolved absolute URL).
      await page.evaluate(() => (window as any).__ARGOS__.afterEach());
      expect(await gif.getAttribute("src")).toMatch(/masked-gif-endpoint$/);
    });

    test("does not pause GIFs when disabled", async ({ page }) => {
      await argosScreenshot(page, "with-gif-disabled", { fullPage: false });

      await page.evaluate(() =>
        (window as any).__ARGOS__.beforeEach({ options: { pauseGifs: false } }),
      );
      await page.waitForFunction(() =>
        (window as any).__ARGOS__.waitFor({ options: { pauseGifs: false } }),
      );

      // The GIF is left untouched (still an animated GIF).
      const src = await page.locator("#gif").getAttribute("src");
      expect(src).toMatch(/^data:image\/gif/);

      await page.evaluate(() => (window as any).__ARGOS__.afterEach());
    });
  });

  test.describe("with argosCSS", () => {
    test("evaluate custom CSS", async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await argosScreenshot(page, "custom-css", {
        argosCSS: "body { background: blue; }",
      });
    });
  });

  test.describe("with custom threshold", () => {
    test("takes a screenshot with the threshold option", async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await argosScreenshot(page, "threshold-option", {
        threshold: 0.2,
      });
    });
  });

  test.describe("with tags", () => {
    test("works", async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await argosScreenshot(page, "tags-option", {
        tag: ["snapshot-tag"],
      });
    });
  });

  test.describe("with Playwright test tags", { tag: ["@on-describe"] }, () => {
    test("captures test tags", { tag: "@on-test" }, async ({ page }) => {
      await page.goto(fixture("basic.html"));
      await argosScreenshot(page, "playwright-test-tags");
    });
  });
});

test.describe("#argosAriaSnapshot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fixture("aria.html"));
  });

  test("takes a an aria snapshot with the screenshot", async ({ page }) => {
    await argosScreenshot(page, "with-aria-snapshot", {
      ariaSnapshot: true,
    });
    await expectSnapshotToExists("with-aria-snapshot", "screenshot");
    await expectSnapshotToExists("with-aria-snapshot", "aria");
  });

  test("takes a an aria snapshot with the screenshot by viewport", async ({
    page,
  }) => {
    await argosScreenshot(page, "with-aria-snapshot-viewport", {
      ariaSnapshot: true,
      viewports: ["iphone-4", "macbook-16"],
    });
  });

  test("takes a an aria snapshot of the page", async ({ page }) => {
    await argosAriaSnapshot(page, "body-aria-snapshot");
    await expectSnapshotToExists("body-aria-snapshot", "aria");
  });

  test("takes a an aria snapshot of the transparent section", async ({
    page,
  }) => {
    await argosAriaSnapshot(page, "section-aria-snapshot", {
      element: "#transparent-section",
    });
    await expectSnapshotToExists("section-aria-snapshot", "aria");
  });
});
