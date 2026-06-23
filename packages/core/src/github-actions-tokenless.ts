import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { Config } from "./config";

const base64Encode = (obj: any) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

/**
 * Check if GitHub Actions tokenless authentication is available for auto-detection.
 */
export function isGitHubActionsTokenlessAvailable(
  config: Pick<Config, "ciProvider" | "prHeadCommit" | "commit">,
): boolean {
  return config.ciProvider === "github-actions";
}

/**
 * Build a tokenless GitHub Actions bearer token from the CI environment.
 */
function getTokenlessBearerToken(
  config: Pick<
    Config,
    "originalRepository" | "jobId" | "runId" | "prNumber" | "project"
  >,
): string {
  const {
    originalRepository: repository,
    jobId,
    runId,
    prNumber,
    project,
  } = config;

  if (!repository || !jobId || !runId) {
    throw new Error(
      `Automatic GitHub Actions variables detection failed. Please set ARGOS_TOKEN.`,
    );
  }

  const [owner, repo] = repository.split("/");

  return `tokenless-github-${base64Encode({
    owner,
    repository: repo,
    jobId,
    runId,
    prNumber: prNumber ?? undefined,
    project: project ?? undefined,
  })}`;
}

/**
 * Exchange a tokenless GitHub Actions bearer token for a short-lived Argos token.
 */
export async function exchangeGitHubActionsTokenlessToken(args: {
  apiBaseUrl: string;
  config: Pick<
    Config,
    | "originalRepository"
    | "jobId"
    | "runId"
    | "prNumber"
    | "branch"
    | "prHeadCommit"
    | "commit"
    | "project"
  >;
}): Promise<string> {
  const { apiBaseUrl, config } = args;
  const commit = config.prHeadCommit ?? config.commit;

  const tokenlessToken = getTokenlessBearerToken(config);

  const apiClient = createClient({ baseUrl: apiBaseUrl });

  const result = await apiClient.POST(
    "/auth/github-actions/tokenless/exchange",
    {
      body: {
        tokenlessToken,
        commit,
        branch: config.branch,
      },
    },
  );

  if (result.error) {
    throwAPIError(result.error, result.response);
  }

  return result.data.token;
}
