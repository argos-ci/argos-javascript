import {
  isGitHubActionsOidcAvailable,
  exchangeGitHubActionsOidcToken,
} from "./github-actions-oidc";
import type { Config } from "./config";
import { debug } from "./debug";

const base64Encode = (obj: any) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

/**
 * Resolve the Argos authentication token, with support for OIDC.
 * Priority: ARGOS_TOKEN > GitHub Actions OIDC > tokenless fallback.
 */
export async function resolveArgosToken(config: Config): Promise<string> {
  if (config.token) {
    debug("Authenticated with ARGOS_TOKEN.");
    return config.token;
  }

  if (isGitHubActionsOidcAvailable()) {
    const token = await exchangeGitHubActionsOidcToken({
      apiBaseUrl: config.apiBaseUrl,
      config,
    });
    debug("Authenticated with GitHub Actions OIDC.");
    debug(`Repository: ${config.originalRepository}`);
    debug(`Run: ${config.runId}`);
    return token;
  }

  const tokenlessToken = getDeprecatedTokenlessToken(config);

  if (tokenlessToken) {
    return tokenlessToken;
  }

  throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
}

/**
 * Get tokenless token.
 */
function getDeprecatedTokenlessToken(args: {
  ciProvider: string | null;
  originalRepository: string | null;
  jobId: string | null;
  runId: string | null;
  prNumber: number | null;
}) {
  const {
    ciProvider,
    originalRepository: repository,
    jobId,
    runId,
    prNumber,
  } = args;

  switch (ciProvider) {
    case "github-actions": {
      if (!repository || !jobId || !runId) {
        throw new Error(
          `Automatic GitHub Actions variables detection failed. Please add the 'ARGOS_TOKEN'`,
        );
      }

      const [owner, repo] = repository.split("/");

      return `tokenless-github-${base64Encode({
        owner,
        repository: repo,
        jobId,
        runId,
        prNumber: prNumber ?? undefined,
      })}`;
    }

    default:
      return null;
  }
}
