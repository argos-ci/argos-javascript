import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { Config } from "./config";

/**
 * Check if GitHub Actions OIDC is available for auto-detection.
 */
export function isGitHubActionsOidcAvailable(): boolean {
  return (
    process.env.GITHUB_ACTIONS === "true" &&
    Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL) &&
    Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) &&
    !process.env.ARGOS_TOKEN
  );
}

async function fetchOidcToken(args: { audience: string }): Promise<string> {
  if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
    throw new Error(`ACTIONS_ID_TOKEN_REQUEST_URL not found`);
  }

  if (!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw new Error(`ACTIONS_ID_TOKEN_REQUEST_TOKEN not found`);
  }

  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", args.audience);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`,
      Accept: "application/json; api-version=2.0",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub Actions OIDC token: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { value?: string };

  if (!data.value) {
    throw new Error(
      "Invalid GitHub Actions OIDC token response: missing 'value' field",
    );
  }

  return data.value;
}

/**
 * Exchange a GitHub Actions OIDC token for a short-lived Argos token.
 */
export async function exchangeGitHubActionsOidcToken(args: {
  apiBaseUrl: string;
  config: Pick<Config, "originalRepository" | "commit" | "branch" | "prNumber">;
}): Promise<string> {
  const { apiBaseUrl, config } = args;

  const audience = new URL(apiBaseUrl).origin;
  const oidcToken = await fetchOidcToken({ audience });

  const apiClient = createClient({ baseUrl: apiBaseUrl });

  const result = await apiClient.POST("/auth/github-actions/oidc/exchange", {
    body: {
      oidcToken,
      repository: config.originalRepository ?? undefined,
      commit: config.commit,
      branch: config.branch,
      pullRequestNumber: config.prNumber ?? undefined,
    },
  });

  if (result.error) {
    throwAPIError(result.error);
  }

  return result.data.token;
}
