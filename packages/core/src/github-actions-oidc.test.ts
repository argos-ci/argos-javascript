import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import {
  isGitHubActionsOidcAvailable,
  exchangeGitHubActionsOidcToken,
} from "./github-actions-oidc";
import {
  MOCK_OIDC_URL,
  MOCK_OIDC_TOKEN,
  MOCK_ARGOS_TOKEN,
  MOCK_EXPIRES_AT,
  setupTokenExchangeServer,
  stubOidcEnv,
} from "../mocks/oidc";

const server = setupTokenExchangeServer();

describe("isGitHubActionsOidcAvailable", () => {
  it("returns true when all OIDC env vars are present and ARGOS_TOKEN is absent", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", MOCK_OIDC_URL);
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-bearer-token");
    vi.stubEnv("ARGOS_TOKEN", "");
    expect(isGitHubActionsOidcAvailable()).toBe(true);
  });

  it("returns false when ARGOS_TOKEN is set", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", MOCK_OIDC_URL);
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-bearer-token");
    vi.stubEnv("ARGOS_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(isGitHubActionsOidcAvailable()).toBe(false);
  });

  it("returns false when GITHUB_ACTIONS is not 'true'", () => {
    vi.stubEnv("GITHUB_ACTIONS", "false");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", MOCK_OIDC_URL);
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-bearer-token");
    vi.stubEnv("ARGOS_TOKEN", "");
    expect(isGitHubActionsOidcAvailable()).toBe(false);
  });

  it("returns false when ACTIONS_ID_TOKEN_REQUEST_URL is missing", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", "");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-bearer-token");
    vi.stubEnv("ARGOS_TOKEN", "");
    expect(isGitHubActionsOidcAvailable()).toBe(false);
  });

  it("returns false when ACTIONS_ID_TOKEN_REQUEST_TOKEN is missing", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", MOCK_OIDC_URL);
    vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "");
    vi.stubEnv("ARGOS_TOKEN", "");
    expect(isGitHubActionsOidcAvailable()).toBe(false);
  });
});

describe("exchangeGitHubActionsOidcToken", () => {
  beforeEach(() => {
    stubOidcEnv();
  });

  const baseConfig = {
    originalRepository: "acme/web",
    commit: "abc123def456abc123def456abc123def456abc1",
    branch: "main",
    prNumber: null,
  };

  it("fetches OIDC token and exchanges it for an Argos token", async () => {
    const token = await exchangeGitHubActionsOidcToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: baseConfig,
    });
    expect(token).toBe(MOCK_ARGOS_TOKEN);
  });

  describe("when the GitHub OIDC endpoint returns an error", () => {
    // Skips the waits between retries.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Answers `status` to the first `times` token requests, then a token. */
    function failOidcRequests(status: number, times = Infinity) {
      const handler = vi.fn(() =>
        handler.mock.calls.length <= times
          ? HttpResponse.json(null, { status })
          : HttpResponse.json({ value: MOCK_OIDC_TOKEN, count: 1 }),
      );
      server.use(http.get(MOCK_OIDC_URL, handler));
      return handler;
    }

    async function exchangeSkippingWaits() {
      const result = exchangeGitHubActionsOidcToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: baseConfig,
      });
      let settled = false;
      result.then(
        () => (settled = true),
        () => (settled = true),
      );
      // Each wait is scheduled only once its failed response has arrived.
      while (!settled) {
        await new Promise((resolve) => setImmediate(resolve));
        await vi.runOnlyPendingTimersAsync();
      }
      return result;
    }

    it("retries a server error", async () => {
      const oidc = failOidcRequests(503, 1);
      await expect(exchangeSkippingWaits()).resolves.toBe(MOCK_ARGOS_TOKEN);
      expect(oidc).toHaveBeenCalledTimes(2);
    });

    it("throws once the retries for server errors run out", async () => {
      const oidc = failOidcRequests(503);
      await expect(exchangeSkippingWaits()).rejects.toThrow(
        "Failed to fetch GitHub Actions OIDC token: 503",
      );
      expect(oidc).toHaveBeenCalledTimes(4);
    });

    it("does not retry a client error", async () => {
      const oidc = failOidcRequests(403);
      await expect(exchangeSkippingWaits()).rejects.toThrow(
        "Failed to fetch GitHub Actions OIDC token: 403",
      );
      expect(oidc).toHaveBeenCalledTimes(1);
    });
  });

  it("throws when the Argos API exchange returns an error", async () => {
    server.use(
      http.get(MOCK_OIDC_URL, () => {
        return HttpResponse.json({ value: "invalid-oidc-token", count: 1 });
      }),
    );
    await expect(
      exchangeGitHubActionsOidcToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: baseConfig,
      }),
    ).rejects.toThrow();
  });

  it("passes optional fields to the exchange request", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(
        "https://api.argos-ci.com/v2/auth/github-actions/oidc/exchange",
        async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            token: MOCK_ARGOS_TOKEN,
            expiresAt: MOCK_EXPIRES_AT,
          });
        },
      ),
    );

    await exchangeGitHubActionsOidcToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: { ...baseConfig, prNumber: 42 },
    });

    expect(capturedBody.repository).toBe("acme/web");
    expect(capturedBody.pullRequestNumber).toBe(42);
    expect(capturedBody.oidcToken).toBe(MOCK_OIDC_TOKEN);
  });
});
