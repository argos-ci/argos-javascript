import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Vitest } from "vitest/node";

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@argos-ci/core", () => ({ upload }));

import { ArgosReporter } from "./reporter";

function createVitest(watch: boolean): Vitest {
  return { config: { watch } } as unknown as Vitest;
}

describe("ArgosReporter", () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({
      build: { url: "https://argos-ci.com/build/1" },
    });
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads screenshots, ARIA and value snapshots at the end of a non-watch run and logs the build URL", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest(false));
    await reporter.onTestRunEnd();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith({
      files: ["**/*.png", "**/*.aria.yml", "**/*.snapshot.*"],
      ignore: ["**/*.argos.json"],
      buildName: "test",
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("https://argos-ci.com/build/1"),
    );
  });

  it("lets the config override the default files glob", async () => {
    const reporter = new ArgosReporter({
      buildName: "test",
      files: ["custom/**/*.png"],
    });
    reporter.onInit(createVitest(false));
    await reporter.onTestRunEnd();
    expect(upload).toHaveBeenCalledWith({
      files: ["custom/**/*.png"],
      ignore: ["**/*.argos.json"],
      buildName: "test",
    });
  });

  it("propagates upload failures", async () => {
    upload.mockRejectedValue(new Error("upload failed"));
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest(false));
    await expect(reporter.onTestRunEnd()).rejects.toThrow("upload failed");
  });

  it("does not upload in watch mode", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest(true));
    await reporter.onTestRunEnd();
    expect(upload).not.toHaveBeenCalled();
  });

  it("onFinished delegates to onTestRunEnd for Vitest v3 compatibility", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest(false));
    await reporter.onFinished();
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
