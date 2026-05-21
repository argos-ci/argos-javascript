import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const MOCK_OIDC_URL = "https://oidc.test.local";
export const MOCK_OIDC_TOKEN = "mock.oidc.jwt";
export const MOCK_ARGOS_TOKEN = "mock-argos-token-returned";
export const MOCK_EXPIRES_AT = "2099-01-01T00:00:00.000Z";
export const MOCK_TOKENLESS_ARGOS_TOKEN = "mock-tokenless-argos-token-returned";

export const tokenExchangeHandlers = [
  http.get(MOCK_OIDC_URL, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("audience") !== "https://api.argos-ci.com") {
      return HttpResponse.json({ error: "wrong audience" }, { status: 400 });
    }
    return HttpResponse.json({ value: MOCK_OIDC_TOKEN, count: 1 });
  }),
  http.post(
    "https://api.argos-ci.com/v2/auth/github-actions/oidc/exchange",
    async ({ request }) => {
      const body = (await request.json()) as { oidcToken?: string };
      if (body.oidcToken === MOCK_OIDC_TOKEN) {
        return HttpResponse.json({
          token: MOCK_ARGOS_TOKEN,
          expiresAt: MOCK_EXPIRES_AT,
        });
      }
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    },
  ),
  http.post(
    "https://api.argos-ci.com/v2/auth/github-actions/tokenless/exchange",
    async ({ request }) => {
      const body = (await request.json()) as {
        tokenlessToken?: string;
        commit?: string;
        branch?: string;
      };
      if (
        typeof body.tokenlessToken === "string" &&
        body.tokenlessToken.startsWith("tokenless-github-") &&
        body.commit &&
        body.branch
      ) {
        return HttpResponse.json({
          token: MOCK_TOKENLESS_ARGOS_TOKEN,
          expiresAt: MOCK_EXPIRES_AT,
        });
      }
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    },
  ),
];

export const tokenExchangeServer = setupServer(...tokenExchangeHandlers);

/**
 * Registers vitest lifecycle hooks to start/stop the token mock server and
 * reset handlers + env stubs between tests. Returns the server so individual
 * tests can override handlers via `server.use(...)`.
 */
export function setupTokenExchangeServer() {
  beforeAll(() => tokenExchangeServer.listen());
  afterEach(() => {
    tokenExchangeServer.resetHandlers();
    vi.unstubAllEnvs();
  });
  afterAll(() => tokenExchangeServer.close());
  return tokenExchangeServer;
}

/** Stubs the env vars required for `isGitHubActionsOidcAvailable()` to return true. */
export function stubOidcEnv() {
  vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_URL", MOCK_OIDC_URL);
  vi.stubEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "github-bearer-token");
}
