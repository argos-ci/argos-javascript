import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { argosScreenshot } from "./index";

/**
 * A white 4x4 PNG.
 */
const PNG = await sharp({
  create: {
    width: 4,
    height: 4,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .png()
  .toBuffer();

/**
 * A WebdriverIO `browser` driving a native app, where no script can run.
 */
function createNativeAppBrowser(context: {
  isNativeContext?: boolean;
  getContext?: () => Promise<string>;
}) {
  return {
    isMobile: true,
    ...context,
    saveScreenshot: vi.fn(async () => PNG),
    execute: vi.fn(async () => {
      throw new Error("No script can run in a native app.");
    }),
  } as unknown as WebdriverIO.Browser;
}

describe("argosScreenshot in a native app", () => {
  let path: string;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "argos-webdriverio-"));
    path = join(dir, "native.png");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("captures the screen as is", async () => {
    const browser = createNativeAppBrowser({ isNativeContext: true });
    const buffer = await argosScreenshot(browser, path);
    expect(buffer).toBe(PNG);
    expect(browser.saveScreenshot).toHaveBeenCalledWith(path);
    expect(browser.execute).not.toHaveBeenCalled();
  });

  it("detects the native context before WebdriverIO 9", async () => {
    const browser = createNativeAppBrowser({
      getContext: async () => "NATIVE_APP",
    });
    await argosScreenshot(browser, path);
    expect(browser.execute).not.toHaveBeenCalled();
  });

  it("masks rectangles", async () => {
    const browser = createNativeAppBrowser({ isNativeContext: true });
    const buffer = await argosScreenshot(browser, path, {
      mask: [{ x: 0, y: 0, width: 2, height: 2 }],
    });
    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const getPixel = (x: number, y: number) => {
      const index = (y * info.width + x) * info.channels;
      return data.subarray(index, index + 3).toString("hex");
    };
    expect([getPixel(1, 1), getPixel(3, 3)]).toEqual(["ff00ff", "ffffff"]);
    expect(browser.execute).not.toHaveBeenCalled();
  });

  it("rejects the options that need a web page", async () => {
    const browser = createNativeAppBrowser({ isNativeContext: true });
    for (const options of [
      { hide: ["~clock"] },
      { remove: ["~banner"] },
      { argosCSS: "* { color: red }" },
      { mask: ["~map"] },
    ]) {
      await expect(argosScreenshot(browser, path, options)).rejects.toThrow(
        "not supported in a native app context",
      );
    }
    expect(browser.saveScreenshot).not.toHaveBeenCalled();
  });
});
