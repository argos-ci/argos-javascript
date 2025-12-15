import type { Context } from "./types";
import { debug } from "../debug";

export type GitHubPullRequest = {
  number: number;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
};

/**
 * Get the full repository name (account/repo) from environment variable.
 */
export function getGitHubRepository(ctx: Context): string | null {
  return ctx.env.GITHUB_REPOSITORY || null;
}

/**
 * Get the full repository name (account/repo) from environment variable or throws.
 */
function assertGitHubRepository(ctx: Context): string {
  const repo = getGitHubRepository(ctx);
  if (!repo) {
    throw new Error("GITHUB_REPOSITORY is missing");
  }
  return repo;
}

/**
 * Get a GitHub token from environment variables.
 */
function getGitHubToken({ env }: Context): string | null {
  if (!env.GITHUB_TOKEN) {
    // For security reasons, people don't want to expose their GITHUB_TOKEN
    // That's why we allow to disable this warning.
    if (!env.DISABLE_GITHUB_TOKEN_WARNING) {
      console.log(
        `
Argos couldn’t find a relevant pull request in the current environment.
To resolve this, Argos requires a GITHUB_TOKEN to fetch the pull request associated with the head SHA. Please ensure the following environment variable is added:

GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

For more details, check out the documentation: Read more at https://argos-ci.com/docs/run-on-preview-deployment

If you want to disable this warning, you can set the following environment variable:

DISABLE_GITHUB_TOKEN_WARNING: true
`.trim(),
      );
    }
    return null;
  }

  return env.GITHUB_TOKEN;
}

/**
 * Fetch GitHub API.
 */
async function fetchGitHubAPI(
  ctx: Context,
  url: URL | string,
): Promise<Response | null> {
  const githubToken = getGitHubToken(ctx);
  if (!githubToken) {
    return null;
  }
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  return response;
}

const GITHUB_API_BASE_URL = "https://api.github.com";

/**
 * Get a pull request from a head sha.
 * Fetch the last 30 pull requests sorted by updated date
 * then try to find the one that matches the head sha.
 * If no pull request is found, return null.
 */
export async function getPullRequestFromHeadSha(
  ctx: Context,
  sha: string,
): Promise<GitHubPullRequest | null> {
  debug(`Fetching pull request details from head sha: ${sha}`);
  const githubRepository = assertGitHubRepository(ctx);
  const url = new URL(`/repos/${githubRepository}/pulls`, GITHUB_API_BASE_URL);
  url.search = new URLSearchParams({
    state: "open",
    sort: "updated",
    per_page: "30",
    page: "1",
  }).toString();
  const response = await fetchGitHubAPI(ctx, url);
  if (!response) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Non-OK response (status: ${response.status}) while fetching pull request details from head sha (${sha})`,
    );
  }
  const result: GitHubPullRequest[] = await response.json();
  if (result.length === 0) {
    debug("No results, no pull request found");
    return null;
  }
  const matchingPr = result.find((pr) => pr.head.sha === sha);
  if (matchingPr) {
    debug("Pull request found", matchingPr);
    return matchingPr;
  }
  debug("No matching pull request found");
  return null;
}

/**
 * Get a pull request from a PR number.
 */
export async function getPullRequestFromPrNumber(
  ctx: Context,
  prNumber: number,
): Promise<GitHubPullRequest | null> {
  debug(`Fetching pull request #${prNumber}`);
  const githubRepository = assertGitHubRepository(ctx);
  const response = await fetchGitHubAPI(
    ctx,
    new URL(
      `/repos/${githubRepository}/pulls/${prNumber}`,
      GITHUB_API_BASE_URL,
    ),
  );
  if (!response) {
    return null;
  }
  if (response.status === 404) {
    debug(
      "No pull request found, pr detection from branch was probably a mistake",
    );
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Non-OK response (status: ${response.status}) while fetching pull request #${prNumber}`,
    );
  }
  const result: GitHubPullRequest = await response.json();
  return result;
}

/**
 * Get the PR number from a merge group branch.
 * Example: gh-readonly-queue/master/pr-1529-c1c25caabaade7a8ddc1178c449b872b5d3e51a4
 */
export function getPRNumberFromMergeGroupBranch(branch: string) {
  const prMatch = /queue\/[^/]*\/pr-(\d+)-/.exec(branch);
  if (prMatch) {
    const prNumber = Number(prMatch[1]);
    return prNumber;
  }
  return null;
}
