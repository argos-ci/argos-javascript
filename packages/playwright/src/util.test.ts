import { describe, it, expect } from "vitest";
import {
  checkIsUsingArgosReporter,
  getAutomaticScreenshotName,
  getBrowserMetadata,
  getSnapshotNames,
} from "./util";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import type { Browser, Page, TestInfo } from "@playwright/test";

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

describe("getSnapshotNames", () => {
  const createMockTestInfo = (
    projectName: string,
    repeatEachIndex = 0,
  ): TestInfo =>
    ({
      project: { name: projectName },
      repeatEachIndex,
    }) as TestInfo;

  it("prefixes the name with the project name", () => {
    const names = getSnapshotNames("hero", createMockTestInfo("chromium"));
    expect(names).toEqual({ name: "chromium/hero", baseNames: null });
  });

  it("does not prefix the name when the project name is empty", () => {
    // No `projects` configured in the Playwright config: the project name is
    // empty. Prefixing would produce an absolute path (`/hero`).
    const names = getSnapshotNames("hero", createMockTestInfo(""));
    expect(names).toEqual({ name: "hero", baseNames: null });
  });

  it("returns the bare name when there is no test info", () => {
    const names = getSnapshotNames("hero", null);
    expect(names).toEqual({ name: "hero", baseNames: null });
  });

  it("handles repeated tests with an empty project name", () => {
    const names = getSnapshotNames("hero", createMockTestInfo("", 2));
    expect(names).toEqual({ name: "hero repeat-2", baseNames: ["hero"] });
  });

  it("prefixes the base names with the project name", () => {
    const names = getSnapshotNames(
      "home-variant-b",
      createMockTestInfo("chromium"),
      ["home-variant-b", "home"],
    );
    expect(names).toEqual({
      name: "chromium/home-variant-b",
      baseNames: ["chromium/home-variant-b", "chromium/home"],
    });
  });

  it("keeps the base names when there is no test info", () => {
    const names = getSnapshotNames("home-variant-b", null, ["home"]);
    expect(names).toEqual({
      name: "home-variant-b",
      baseNames: ["home"],
    });
  });

  it("ignores an empty list of base names", () => {
    const names = getSnapshotNames("hero", createMockTestInfo("chromium"), []);
    expect(names).toEqual({ name: "chromium/hero", baseNames: null });
  });

  it("lets the base names win over the implicit repeat baseline", () => {
    const names = getSnapshotNames(
      "home-variant-b",
      createMockTestInfo("", 2),
      ["home-variant-b", "home"],
    );
    expect(names).toEqual({
      name: "home-variant-b repeat-2",
      baseNames: ["home-variant-b", "home"],
    });
  });
});

describe("checkIsUsingArgosReporter", () => {
  const createMockTestInfo = (reporter: [string, unknown?][]): TestInfo =>
    ({ config: { reporter } }) as unknown as TestInfo;

  it("returns false without test info", () => {
    expect(checkIsUsingArgosReporter(null)).toBe(false);
  });

  it("detects the reporter from the import specifier", () => {
    const testInfo = createMockTestInfo([
      ["dot"],
      ["@argos-ci/playwright/reporter", {}],
    ]);
    expect(checkIsUsingArgosReporter(testInfo)).toBe(true);
  });

  it("detects the reporter from a Playwright-resolved absolute path", () => {
    // Playwright resolves reporter ids to absolute paths pointing at the
    // package's dist file, which no longer contains `/reporter`.
    const testInfo = createMockTestInfo([
      ["list"],
      ["/repo/node_modules/@argos-ci/playwright/dist/reporter.mjs", {}],
    ]);
    expect(checkIsUsingArgosReporter(testInfo)).toBe(true);
  });

  it("detects the reporter from a pnpm-resolved absolute path", () => {
    const testInfo = createMockTestInfo([
      [
        "/repo/node_modules/.pnpm/@argos-ci+playwright@7.1.2/node_modules/@argos-ci/playwright/dist/reporter.mjs",
        {},
      ],
    ]);
    expect(checkIsUsingArgosReporter(testInfo)).toBe(true);
  });

  it("returns false when the reporter is not configured", () => {
    const testInfo = createMockTestInfo([["dot"], ["list"]]);
    expect(checkIsUsingArgosReporter(testInfo)).toBe(false);
  });
});

const ELECTRON_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) my-app/1.0.0 Chrome/140.0.7339.41 Electron/38.2.0 Safari/537.36";

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.41 Safari/537.36";

describe("getBrowserMetadata", () => {
  /**
   * Create a page whose `evaluate` resolves to `userAgent`, as the real
   * function only runs in a browser.
   */
  const createMockPage = (args: {
    browser?: Browser;
    userAgent?: string;
  }): Page =>
    ({
      context: () => ({ browser: () => args.browser ?? null }),
      evaluate: async () => args.userAgent,
    }) as unknown as Page;

  it("returns the browser of the context", async () => {
    const browser = {
      browserType: () => ({ name: () => "chromium" }),
      version: () => "140.0.7339.41",
    } as unknown as Browser;
    const page = createMockPage({ browser });
    expect(await getBrowserMetadata(page)).toEqual({
      name: "chromium",
      version: "140.0.7339.41",
    });
  });

  it("detects Electron when the context has no browser", async () => {
    const page = createMockPage({ userAgent: ELECTRON_USER_AGENT });
    expect(await getBrowserMetadata(page)).toEqual({
      name: "electron",
      version: "38.2.0",
    });
  });

  it("reads Electron pre-release versions", async () => {
    const page = createMockPage({
      userAgent: ELECTRON_USER_AGENT.replace(
        "Electron/38.2.0",
        "Electron/39.0.0-beta.3",
      ),
    });
    expect(await getBrowserMetadata(page)).toEqual({
      name: "electron",
      version: "39.0.0-beta.3",
    });
  });

  it("returns undefined when the browser can't be identified", async () => {
    const page = createMockPage({ userAgent: CHROME_USER_AGENT });
    expect(await getBrowserMetadata(page)).toBeUndefined();
  });
});
