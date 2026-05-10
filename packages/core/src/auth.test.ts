import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { resolveArgosToken } from "./auth";
import type { Config } from "./config";
import {
  MOCK_ARGOS_TOKEN,
  MOCK_OIDC_URL,
  setupOidcServer,
  stubOidcEnv,
} from "../mocks/oidc";

const baseConfig: Config = {
  apiBaseUrl: "https://api.argos-ci.com/v2/",
  token: null,
  commit: "abc123def456abc123def456abc123def456abc1",
  branch: "main",
  buildName: null,
  parallel: false,
  parallelNonce: null,
  parallelIndex: null,
  parallelTotal: null,
  referenceBranch: null,
  referenceCommit: null,
  repository: null,
  originalRepository: "acme/web",
  jobId: "job-1",
  runId: "run-42",
  runAttempt: null,
  prNumber: null,
  prHeadCommit: null,
  prBaseBranch: null,
  mode: null,
  ciProvider: null,
  threshold: null,
  previewBaseUrl: null,
  skipped: false,
  mergeQueuePrNumbers: null,
  subset: false,
};

const server = setupOidcServer();

describe("resolveArgosToken", () => {
  beforeEach(() => {
    // Ensure GitHub Actions OIDC is not available by default in every test.
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", "");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "");
    vi.stubEnv("ARGOS_TOKEN", "");
  });

  describe("ARGOS_TOKEN priority", () => {
    it("returns config.token directly without any network call", async () => {
      const token = await resolveArgosToken({
        ...baseConfig,
        token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
      expect(token).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    });

    it("skips OIDC even when GitHub Actions env vars are present", async () => {
      vi.stubEnv("GITHUB_ACTIONS", "true");
      stubOidcEnv();
      const token = await resolveArgosToken({
        ...baseConfig,
        token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
      expect(token).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    });
  });

  describe("GitHub Actions OIDC", () => {
    beforeEach(() => {
      vi.stubEnv("GITHUB_ACTIONS", "true");
      stubOidcEnv();
    });

    it("exchanges the OIDC token for an Argos token", async () => {
      const token = await resolveArgosToken(baseConfig);
      expect(token).toBe(MOCK_ARGOS_TOKEN);
    });

    it("throws when the GitHub OIDC endpoint fails", async () => {
      server.use(
        http.get(MOCK_OIDC_URL, () => HttpResponse.json(null, { status: 500 })),
      );
      await expect(resolveArgosToken(baseConfig)).rejects.toThrow(
        "Failed to fetch GitHub Actions OIDC token: 500",
      );
    });

    it("throws when the Argos exchange endpoint rejects the OIDC token", async () => {
      server.use(
        http.get(MOCK_OIDC_URL, () =>
          HttpResponse.json({ value: "invalid-token", count: 1 }),
        ),
      );
      await expect(resolveArgosToken(baseConfig)).rejects.toThrow();
    });
  });

  describe("no authentication method available", () => {
    it("throws for an unsupported CI provider", async () => {
      await expect(
        resolveArgosToken({ ...baseConfig, ciProvider: "gitlab-ci" }),
      ).rejects.toThrow("Missing Argos repository token 'ARGOS_TOKEN'");
    });

    it("throws when ciProvider is null and no token or OIDC", async () => {
      await expect(
        resolveArgosToken({ ...baseConfig, ciProvider: null }),
      ).rejects.toThrow("Missing Argos repository token 'ARGOS_TOKEN'");
    });

    it("throws when ciProvider is circleci (unsupported tokenless)", async () => {
      await expect(
        resolveArgosToken({ ...baseConfig, ciProvider: "circleci" }),
      ).rejects.toThrow("Missing Argos repository token 'ARGOS_TOKEN'");
    });
  });
});
