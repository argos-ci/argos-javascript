import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { exchangeGitHubActionsTokenlessToken } from "./github-actions-tokenless";
import {
  MOCK_TOKENLESS_ARGOS_TOKEN,
  MOCK_EXPIRES_AT,
  setupTokenExchangeServer,
} from "../mocks/oidc";

const base64Decode = (str: string): unknown =>
  JSON.parse(Buffer.from(str, "base64").toString("utf8"));

const server = setupTokenExchangeServer();

describe("exchangeGitHubActionsTokenlessToken", () => {
  const baseConfig = {
    originalRepository: "acme/web",
    jobId: "job-1",
    runId: "run-42",
    prNumber: null,
    prHeadCommit: null,
    commit: "abc123def456abc123def456abc123def456abc1",
    branch: "main",
    project: null,
  };

  it("builds the tokenless bearer token and exchanges it for an Argos token", async () => {
    const token = await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: baseConfig,
    });
    expect(token).toBe(MOCK_TOKENLESS_ARGOS_TOKEN);
  });

  it("throws when originalRepository is missing", async () => {
    await expect(
      exchangeGitHubActionsTokenlessToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: { ...baseConfig, originalRepository: null },
      }),
    ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
  });

  it("throws when jobId is missing", async () => {
    await expect(
      exchangeGitHubActionsTokenlessToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: { ...baseConfig, jobId: null },
      }),
    ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
  });

  it("throws when runId is missing", async () => {
    await expect(
      exchangeGitHubActionsTokenlessToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: { ...baseConfig, runId: null },
      }),
    ).rejects.toThrow("Automatic GitHub Actions variables detection failed");
  });

  it("throws when the Argos API exchange returns an error", async () => {
    server.use(
      http.post(
        "https://api.argos-ci.com/v2/auth/github-actions/tokenless/exchange",
        () => HttpResponse.json({ error: "Forbidden" }, { status: 403 }),
      ),
    );
    await expect(
      exchangeGitHubActionsTokenlessToken({
        apiBaseUrl: "https://api.argos-ci.com/v2/",
        config: baseConfig,
      }),
    ).rejects.toThrow();
  });

  it("sends commit, branch and a tokenless bearer token encoding GitHub variables", async () => {
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

    await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: { ...baseConfig, prNumber: 99 },
    });

    expect(capturedBody.commit).toBe(baseConfig.commit);
    expect(capturedBody.branch).toBe(baseConfig.branch);
    expect(typeof capturedBody.tokenlessToken).toBe("string");
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

  it("includes the project slug in the bearer token when set", async () => {
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

    await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: { ...baseConfig, project: "acme/web-app" },
    });

    const bearer = capturedBody.tokenlessToken as string;
    const payload = base64Decode(bearer.replace("tokenless-github-", "")) as {
      project?: string;
    };
    expect(payload.project).toBe("acme/web-app");
  });

  it("omits the project slug from the bearer token when null", async () => {
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

    await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: baseConfig,
    });

    const bearer = capturedBody.tokenlessToken as string;
    const payload = base64Decode(bearer.replace("tokenless-github-", "")) as {
      project?: string;
    };
    expect(payload.project).toBeUndefined();
  });

  it("omits prNumber from the bearer token when null", async () => {
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

    await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      config: baseConfig,
    });

    const bearer = capturedBody.tokenlessToken as string;
    const payload = base64Decode(bearer.replace("tokenless-github-", "")) as {
      prNumber?: number;
    };
    expect(payload.prNumber).toBeUndefined();
  });
});
