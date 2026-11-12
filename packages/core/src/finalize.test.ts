import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createBuildRequests } from "../mocks/handlers/createBuild";
import { finalizeBuildsRequests } from "../mocks/handlers/finalizeBuilds";
import { setupMockServer } from "../mocks/server";
import { finalize } from "./finalize";

setupMockServer();

describe("#finalize", () => {
  beforeEach(() => {
    // Neutralize CI detection so the tests behave the same locally and on
    // GitHub Actions, where a nonce would be derived from the run
    // automatically.
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.stubEnv("ARGOS_COMMIT", "f16f980bd17cccfa93a1ae7766727e67950773d0");
    vi.stubEnv("ARGOS_BRANCH", "main");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("finalizes builds matching the nonce", async () => {
    const result = await finalize({
      apiBaseUrl: "https://api.argos-ci.dev",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      parallel: { nonce: "nonce-123" },
    });

    expect(result).toEqual({
      builds: [{ id: "456", url: "https://app.argos-ci.dev/builds/456" }],
      skippedBuild: null,
    });
  });

  it("returns no builds when the nonce matches nothing", async () => {
    const result = await finalize({
      apiBaseUrl: "https://api.argos-ci.dev",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      parallel: { nonce: "empty" },
    });

    expect(result).toEqual({ builds: [], skippedBuild: null });
  });

  it("throws without a nonce", async () => {
    await expect(
      finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      }),
    ).rejects.toThrow("parallel.nonce is required to finalize the build");
  });

  describe("with skipIfEmpty", () => {
    it("creates a skipped build when the nonce matches nothing", async () => {
      const result = await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "empty" },
        skipIfEmpty: true,
        buildName: "unit",
      });

      expect(result).toEqual({
        builds: [],
        skippedBuild: {
          id: "123",
          url: "https://app.argos-ci.dev/builds/123",
        },
      });
    });

    it("does not create a skipped build when builds are finalized", async () => {
      const result = await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "nonce-123" },
        skipIfEmpty: true,
        buildName: "unit",
      });

      expect(result).toEqual({
        builds: [{ id: "456", url: "https://app.argos-ci.dev/builds/456" }],
        skippedBuild: null,
      });
    });
  });

  describe("project", () => {
    beforeEach(() => {
      finalizeBuildsRequests.length = 0;
      createBuildRequests.length = 0;
    });

    it("names the project, on the skipped build too", async () => {
      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        project: "acme/web",
        parallel: { nonce: "empty" },
        skipIfEmpty: true,
      });

      expect(finalizeBuildsRequests).toEqual([
        { parallelNonce: "empty", project: "acme/web" },
      ]);
      expect(createBuildRequests).toEqual([
        expect.objectContaining({ project: "acme/web", skipped: true }),
      ]);
    });

    it("reads the project from ARGOS_PROJECT", async () => {
      vi.stubEnv("ARGOS_PROJECT", "acme/docs");

      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "nonce-123" },
      });

      expect(finalizeBuildsRequests).toEqual([
        { parallelNonce: "nonce-123", project: "acme/docs" },
      ]);
    });

    it("sends no project when it is not set", async () => {
      vi.stubEnv("ARGOS_PROJECT", "");

      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "empty" },
        skipIfEmpty: true,
      });

      expect(finalizeBuildsRequests).toEqual([{ parallelNonce: "empty" }]);
      expect(createBuildRequests).toHaveLength(1);
      expect(createBuildRequests[0]).not.toHaveProperty("project");
    });
  });
});
