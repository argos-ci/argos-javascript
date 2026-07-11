import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Vitest } from "vitest/node";

const { upload, readConfig } = vi.hoisted(() => ({
  upload: vi.fn(),
  readConfig: vi.fn(),
}));
vi.mock("@argos-ci/core", () => ({ upload, readConfig }));

import { ArgosReporter } from "./reporter";

function createVitest(config: {
  watch?: boolean;
  shard?: { index: number; count: number };
}): Vitest {
  return { config: { watch: false, ...config } } as unknown as Vitest;
}

/** Default Argos config with no parallel env variables set. */
function argosConfig(
  overrides: Partial<{
    parallelNonce: string | null;
    parallelTotal: number | null;
    parallelIndex: number | null;
  }> = {},
) {
  return {
    parallelNonce: null,
    parallelTotal: null,
    parallelIndex: null,
    ...overrides,
  };
}

describe("ArgosReporter", () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({
      build: { url: "https://argos-ci.com/build/1" },
    });
    readConfig.mockReset();
    readConfig.mockResolvedValue(argosConfig());
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads screenshots, ARIA and value snapshots at the end of a non-watch run and logs the build URL", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({}));
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
    reporter.onInit(createVitest({}));
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
    reporter.onInit(createVitest({}));
    await expect(reporter.onTestRunEnd()).rejects.toThrow("upload failed");
  });

  it("does not upload in watch mode", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({ watch: true }));
    await reporter.onTestRunEnd();
    expect(upload).not.toHaveBeenCalled();
  });

  it("onFinished delegates to onTestRunEnd for Vitest v3 compatibility", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({}));
    await reporter.onFinished();
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("does not set parallel when not sharding", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({}));
    await reporter.onTestRunEnd();
    // Without a shard config we never read the Argos config.
    expect(readConfig).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ parallel: undefined }),
    );
  });

  it("derives parallel options from `vitest --shard=2/4`", async () => {
    readConfig.mockResolvedValue(argosConfig({ parallelNonce: "nonce-1" }));
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({ shard: { index: 2, count: 4 } }));
    await reporter.onTestRunEnd();
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        parallel: { total: 4, nonce: "nonce-1", index: 2 },
      }),
    );
  });

  it("throws when sharding without ARGOS_PARALLEL_NONCE", async () => {
    readConfig.mockResolvedValue(argosConfig({ parallelNonce: null }));
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({ shard: { index: 1, count: 4 } }));
    await expect(reporter.onTestRunEnd()).rejects.toThrow(
      "ARGOS_PARALLEL_NONCE",
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("lets ARGOS_PARALLEL_TOTAL/INDEX override the shard values", async () => {
    readConfig.mockResolvedValue(
      argosConfig({
        parallelNonce: "nonce-1",
        parallelTotal: 8,
        parallelIndex: 5,
      }),
    );
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({ shard: { index: 2, count: 4 } }));
    await reporter.onTestRunEnd();
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        parallel: { total: 8, nonce: "nonce-1", index: 5 },
      }),
    );
  });

  it("ignores a single shard (count 1)", async () => {
    const reporter = new ArgosReporter({ buildName: "test" });
    reporter.onInit(createVitest({ shard: { index: 1, count: 1 } }));
    await reporter.onTestRunEnd();
    expect(readConfig).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ parallel: undefined }),
    );
  });

  it("lets an explicit reporter `parallel` config win over shard detection", async () => {
    readConfig.mockResolvedValue(argosConfig({ parallelNonce: "nonce-1" }));
    const reporter = new ArgosReporter({
      buildName: "test",
      parallel: { total: 2, nonce: "explicit", index: 1 },
    });
    reporter.onInit(createVitest({ shard: { index: 2, count: 4 } }));
    await reporter.onTestRunEnd();
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        parallel: { total: 2, nonce: "explicit", index: 1 },
      }),
    );
  });
});
