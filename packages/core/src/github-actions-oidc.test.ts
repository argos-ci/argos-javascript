import { describe, it, expect, beforeEach, vi } from "vitest";
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

  it("throws when the GitHub OIDC endpoint returns an error", async () => {
    server.use(
      http.get(MOCK_OIDC_URL, () => {
        return HttpResponse.json(null, { status: 500 });
      }),
    );
    await expect(
      exchangeGitHubActionsOidcToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: baseConfig,
      }),
    ).rejects.toThrow("Failed to fetch GitHub Actions OIDC token: 500");
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
