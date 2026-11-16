import { describe, expect, it } from "vitest";
import { getStoryScreenshotName } from "./name";

describe("getStoryScreenshotName", () => {
  it.each([
    [null, "chromium", "button--primary"],
    [null, null, "button--primary"],
    [null, "firefox", "button--primary browser-[firefox]"],
    ["dark", "chromium", "button--primary mode-[dark]"],
    ["dark", "webkit", "button--primary mode-[dark] browser-[webkit]"],
  ])("mode %s in %s gives %j", (mode, browserName, expected) => {
    expect(
      getStoryScreenshotName({ name: "button--primary", mode, browserName }),
    ).toBe(expected);
  });
});
