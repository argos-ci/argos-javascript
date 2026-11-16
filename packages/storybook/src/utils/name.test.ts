import { describe, expect, it } from "vitest";
import { getStoryScreenshotName } from "./name";

describe("getStoryScreenshotName", () => {
  it("keeps the plain name in Chromium", () => {
    expect(
      getStoryScreenshotName({
        name: "button--primary",
        mode: null,
        browserName: "chromium",
      }),
    ).toBe("button--primary");
  });

  it("keeps the plain name when the browser is unknown", () => {
    expect(
      getStoryScreenshotName({
        name: "button--primary",
        mode: null,
        browserName: null,
      }),
    ).toBe("button--primary");
  });

  it("names the browser outside Chromium", () => {
    expect(
      getStoryScreenshotName({
        name: "button--primary",
        mode: null,
        browserName: "firefox",
      }),
    ).toBe("button--primary browser-[firefox]");
  });

  it("names the mode", () => {
    expect(
      getStoryScreenshotName({
        name: "button--primary",
        mode: "dark",
        browserName: "chromium",
      }),
    ).toBe("button--primary mode-[dark]");
  });

  it("names the browser after the mode", () => {
    expect(
      getStoryScreenshotName({
        name: "button--primary/step",
        mode: "dark",
        browserName: "webkit",
      }),
    ).toBe("button--primary/step mode-[dark] browser-[webkit]");
  });
});
