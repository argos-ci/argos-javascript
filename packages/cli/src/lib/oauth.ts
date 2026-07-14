import { createHash, randomBytes } from "node:crypto";

/**
 * OAuth 2.1 client configuration and helpers for the `argos login` flow
 * (Authorization Code + PKCE with a loopback redirect, RFC 8252).
 *
 * The authorization server is the Argos app origin; endpoints and token
 * validation are implemented in the main Argos repo (`apps/backend/src/oauth`).
 */

/** First-party public client id, seeded in the Argos database. */
export const OAUTH_CLIENT_ID = "argos-cli";

/**
 * Scopes requested by `argos login`, covering the CLI's user actions (identity,
 * projects, reviews, comments). Build upload keeps using a project token.
 */
export const OAUTH_SCOPES = [
  "profile",
  "projects:read",
  "projects:write",
  "reviews:write",
  "comments:read",
  "comments:write",
] as const;

/** Refresh a bit early so a token never expires mid-request. */
const EXPIRY_SKEW_MS = 60 * 1000;

export function getAppBaseUrl(): string {
  return process.env["ARGOS_APP_BASE_URL"] ?? "https://app.argos-ci.com/";
}

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token should be considered expired. */
  expiresAt: number;
  scope: string;
};

type TokenEndpointResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function toTokenSet(data: TokenEndpointResponse): OAuthTokenSet {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SKEW_MS,
    scope: data.scope ?? "",
  };
}

/** Generate a PKCE `code_verifier` and its S256 `code_challenge`. */
export function generatePkce(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

/** Build the `/oauth/authorize` URL to open in the browser. */
export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL("/oauth/authorize", getAppBaseUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.href;
}

async function postToken(
  body: Record<string, string>,
): Promise<TokenEndpointResponse> {
  const url = new URL("/oauth/token", getAppBaseUrl());
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await response
    .json()
    .catch(() => null)) as TokenEndpointResponse | null;
  if (!response.ok || !data?.access_token) {
    const message =
      data?.error_description ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

/** Exchange an authorization code for a token set (`grant_type=authorization_code`). */
export async function exchangeAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuthTokenSet> {
  return toTokenSet(
    await postToken({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: OAUTH_CLIENT_ID,
      code_verifier: params.codeVerifier,
    }),
  );
}

/** Rotate a refresh token for a new token set (`grant_type=refresh_token`). */
export async function refreshTokenSet(
  refreshToken: string,
): Promise<OAuthTokenSet> {
  return toTokenSet(
    await postToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
    }),
  );
}

/** Best-effort token revocation (RFC 7009); never throws. */
export async function revokeToken(token: string): Promise<void> {
  const url = new URL("/oauth/revoke", getAppBaseUrl());
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token,
      client_id: OAUTH_CLIENT_ID,
    }).toString(),
  }).catch(() => {});
}
