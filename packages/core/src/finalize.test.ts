import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { server, setupMockServer } from "../mocks/server";
import { finalize } from "./finalize";

/**
 * Answer `POST /builds/finalize` with no builds, and `POST /builds` with a
 * skipped build, collecting the bodies `finalize` sends to each.
 */
function captureBodies() {
  const received: {
    finalize: Record<string, unknown>[];
    createBuild: Record<string, unknown>[];
  } = { finalize: [], createBuild: [] };
  server.use(
    http.post(
      "https://api.argos-ci.dev/builds/finalize",
      async ({ request }) => {
        received.finalize.push(
          (await request.json()) as Record<string, unknown>,
        );
        return HttpResponse.json({ builds: [] });
      },
    ),
    http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
      received.createBuild.push(
        (await request.json()) as Record<string, unknown>,
      );
      return HttpResponse.json({
        build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
        screenshots: [],
      });
    }),
  );
  return received;
}

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
    it("names the project, on the skipped build too", async () => {
      const received = captureBodies();

      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        project: "acme/web",
        parallel: { nonce: "nonce-123" },
        skipIfEmpty: true,
      });

      expect(received.finalize).toEqual([
        { parallelNonce: "nonce-123", project: "acme/web" },
      ]);
      expect(received.createBuild).toEqual([
        expect.objectContaining({ project: "acme/web", skipped: true }),
      ]);
    });

    it("reads the project from ARGOS_PROJECT", async () => {
      vi.stubEnv("ARGOS_PROJECT", "acme/docs");
      const received = captureBodies();

      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "nonce-123" },
      });

      expect(received.finalize).toEqual([
        { parallelNonce: "nonce-123", project: "acme/docs" },
      ]);
    });

    it("sends no project when it is not set", async () => {
      vi.stubEnv("ARGOS_PROJECT", "");
      const received = captureBodies();

      await finalize({
        apiBaseUrl: "https://api.argos-ci.dev",
        token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
        parallel: { nonce: "nonce-123" },
        skipIfEmpty: true,
      });

      expect(received.finalize).toEqual([{ parallelNonce: "nonce-123" }]);
      expect(received.createBuild).toHaveLength(1);
      expect(received.createBuild[0]).not.toHaveProperty("project");
    });
  });
});
