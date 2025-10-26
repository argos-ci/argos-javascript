import { describe, it, expect } from "vitest";
import { getAutomaticScreenshotName } from "./util";
import type { TestCase, TestResult } from "@playwright/test/reporter";

describe("getAutomaticScreenshotName", () => {
  const createMockTest = (
    id: string,
    title: string,
    titlePath: string[],
  ): TestCase => {
    return {
      id,
      title,
      titlePath: () => titlePath,
    } as TestCase;
  };

  const createMockResult = (
    status: "passed" | "failed" | "timedOut" | "skipped",
    retry: number = 0,
  ): TestResult => {
    return {
      status,
      retry,
    } as TestResult;
  };

  it("generates name from title path", () => {
    const test = createMockTest("test-1", "takes a screenshot", [
      "suite",
      "takes a screenshot",
    ]);
    const result = createMockResult("passed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite takes a screenshot");
  });

  it("adds retry suffix for retried tests", () => {
    const test = createMockTest("test-1", "takes a screenshot", [
      "suite",
      "takes a screenshot",
    ]);
    const result = createMockResult("passed", 1);

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite takes a screenshot #2");
  });

  it("adds failed suffix for failed tests", () => {
    const test = createMockTest("test-1", "takes a screenshot", [
      "suite",
      "takes a screenshot",
    ]);
    const result = createMockResult("failed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite takes a screenshot (failed)");
  });

  it("adds failed suffix for timed out tests", () => {
    const test = createMockTest("test-1", "takes a screenshot", [
      "suite",
      "takes a screenshot",
    ]);
    const result = createMockResult("timedOut");

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite takes a screenshot (failed)");
  });

  it("adds both retry and failed suffix", () => {
    const test = createMockTest("test-1", "takes a screenshot", [
      "suite",
      "takes a screenshot",
    ]);
    const result = createMockResult("failed", 2);

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite takes a screenshot #3 (failed)");
  });

  it("truncates long names and uses test id", () => {
    const longTitle = "a".repeat(300);
    const test = createMockTest("test-123", longTitle, ["suite", longTitle]);
    const result = createMockResult("passed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name.length).toBeLessThanOrEqual(240);
    expect(name).toContain("test-123");
    expect(name).toContain(longTitle.slice(0, 50));
    expect(name).toMatch(/…$/);
  });

  it("truncates long names with suffix", () => {
    const longTitle = "a".repeat(300);
    const test = createMockTest("test-456", longTitle, ["suite", longTitle]);
    const result = createMockResult("failed", 1);

    const name = getAutomaticScreenshotName(test, result);

    expect(name.length).toBeLessThanOrEqual(240);
    expect(name).toContain("test-456");
    expect(name).toContain("#2 (failed)");
    expect(name).toMatch(/… #2 \(failed\)$/);
  });

  it("handles nested title paths", () => {
    const test = createMockTest("test-1", "nested test", [
      "suite",
      "sub-suite",
      "sub-sub-suite",
      "nested test",
    ]);
    const result = createMockResult("passed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("suite sub-suite sub-sub-suite nested test");
  });

  it("handles empty title path", () => {
    const test = createMockTest("test-1", "test", []);
    const result = createMockResult("passed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name).toBe("");
  });

  it("preserves exact length at 240 character boundary", () => {
    const exactTitle = "a".repeat(240);
    const test = createMockTest("test-1", exactTitle, [exactTitle]);
    const result = createMockResult("passed");

    const name = getAutomaticScreenshotName(test, result);

    expect(name.length).toBeLessThanOrEqual(240);
  });
});
