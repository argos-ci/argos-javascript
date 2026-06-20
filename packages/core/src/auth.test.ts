import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { resolveArgosToken } from "./auth";
import type { Config } from "./config";
import {
  MOCK_ARGOS_TOKEN,
  MOCK_EXPIRES_AT,
  MOCK_OIDC_URL,
  MOCK_TOKENLESS_ARGOS_TOKEN,
  setupTokenExchangeServer,
  stubOidcEnv,
} from "../mocks/oidc";

const base64Decode = (str: string): unknown =>
  JSON.parse(Buffer.from(str, "base64").toString("utf8"));

const baseConfig: Config = {
  apiBaseUrl: "https://api.argos-ci.com/v2/",
  token: null,
  project: null,
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
  prHeadCommit: "abc123def456abc123def456abc123def456abc1",
  prBaseBranch: null,
  mode: null,
  ciProvider: null,
  threshold: null,
  previewBaseUrl: null,
  skipped: false,
  mergeQueuePrNumbers: null,
  subset: false,
};

const server = setupTokenExchangeServer();

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

    it("is preferred over the tokenless exchange fallback", async () => {
      const token = await resolveArgosToken({
        ...baseConfig,
        ciProvider: "github-actions",
      });
      // The OIDC path returns the OIDC mock token, not the tokenless one.
      expect(token).toBe(MOCK_ARGOS_TOKEN);
    });
  });

  describe("GitHub Actions tokenless exchange (no OIDC)", () => {
    it("exchanges the tokenless bearer token for a short-lived Argos token", async () => {
      const token = await resolveArgosToken({
        ...baseConfig,
        ciProvider: "github-actions",
      });
      expect(token).toBe(MOCK_TOKENLESS_ARGOS_TOKEN);
    });

    it("sends the expected payload (commit, branch, tokenless bearer)", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          "https://api.argos-ci.com/v2/auth/github-actions/tokenless/exchange",
          async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({
              token: MOCK_TOKENLESS_ARGOS_TOKEN,
              expiresAt: MOCK_EXPIRES_AT,
            });
          },
        ),
      );

      await resolveArgosToken({
        ...baseConfig,
        ciProvider: "github-actions",
        prNumber: 99,
      });

      expect(capturedBody.commit).toBe(baseConfig.commit);
      expect(capturedBody.branch).toBe(baseConfig.branch);
      const bearer = capturedBody.tokenlessToken as string;
      expect(bearer.startsWith("tokenless-github-")).toBe(true);
      const payload = base64Decode(bearer.replace("tokenless-github-", ""));
      expect(payload).toEqual({
        owner: "acme",
        repository: "web",
        jobId: "job-1",
        runId: "run-42",
        prNumber: 99,
      });
    });

    it("throws when the Argos tokenless exchange endpoint rejects the request", async () => {
      server.use(
        http.post(
          "https://api.argos-ci.com/v2/auth/github-actions/tokenless/exchange",
          () => HttpResponse.json({ error: "Forbidden" }, { status: 403 }),
        ),
      );
      await expect(
        resolveArgosToken({ ...baseConfig, ciProvider: "github-actions" }),
      ).rejects.toThrow();
    });

    it("throws when originalRepository is missing", async () => {
      await expect(
        resolveArgosToken({
          ...baseConfig,
          ciProvider: "github-actions",
          originalRepository: null,
        }),
      ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
    });

    it("throws when jobId is missing", async () => {
      await expect(
        resolveArgosToken({
          ...baseConfig,
          ciProvider: "github-actions",
          jobId: null,
        }),
      ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
    });

    it("throws when runId is missing", async () => {
      await expect(
        resolveArgosToken({
          ...baseConfig,
          ciProvider: "github-actions",
          runId: null,
        }),
      ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
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
