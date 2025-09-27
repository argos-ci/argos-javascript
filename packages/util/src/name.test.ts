import { describe, expect, it } from "vitest";
import { getScreenshotName } from "./name";

describe("getScreenshotName", () => {
  it("returns the name unchanged if no options are provided and name is safe", () => {
    expect(getScreenshotName("test")).toBe("test");
  });

  it("appends viewportWidth if provided", () => {
    expect(getScreenshotName("test", { viewportWidth: 800 })).toBe(
      "test vw-800",
    );
  });

  it("sanitizes reserved characters in name", () => {
    expect(getScreenshotName("foo/bar:baz*test")).toBe("foo/bar-baz-test");
  });

  it("sanitizes reserved Windows names", () => {
    expect(getScreenshotName("con")).toBe("con-");
    expect(getScreenshotName("COM1")).toBe("COM1-");
    expect(getScreenshotName("lpt9")).toBe("lpt9-");
  });

  it("sanitizes reserved characters and appends viewportWidth", () => {
    expect(getScreenshotName("foo/bar:baz", { viewportWidth: 1024 })).toBe(
      "foo/bar-baz vw-1024",
    );
  });

  it("handles empty name", () => {
    expect(getScreenshotName("")).toBe("");
  });

  it("removes trailing dot and space", () => {
    expect(getScreenshotName("foo.")).toBe("foo-");
    expect(getScreenshotName("foo ")).toBe("foo-");
  });

  it("handles slashes in name", () => {
    expect(getScreenshotName("folder/subfolder/file")).toBe(
      "folder/subfolder/file",
    );
  });

  it("handles control characters", () => {
    expect(getScreenshotName("foo\u0000bar")).toBe("foo-bar");
  });
});
