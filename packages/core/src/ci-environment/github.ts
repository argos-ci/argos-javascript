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
 * Build the URL of an API endpoint. The runner sets `GITHUB_API_URL`, which
 * points at the appliance on GitHub Enterprise and at the public API elsewhere.
 *
 * Joined by hand rather than through the `URL` base argument, which would drop
 * the path an Enterprise appliance is mounted under: an absolute path replaces
 * it outright.
 */
function buildGitHubAPIURL({ env }: Context, path: string): URL {
  const base = (env.GITHUB_API_URL || "https://api.github.com").replace(
    /\/+$/,
    "",
  );
  return new URL(`${base}${path}`);
}

/**
 * Read the GitHub token from the environment, without telling the user off for
 * not having set one.
 */
function readGitHubToken({ env }: Context): string | null {
  return env.GITHUB_TOKEN || null;
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

For more details, check out the documentation: Read more at https://argos-ci.com/docs/learn/how-to-guides/ci-pipelines/run-on-preview-deployments

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
  options?: {
    /**
     * Tell the user how to set a token when there is none. Left off by callers
     * that fall back to something else, so a working build stays quiet.
     */
    notifyWithoutToken?: boolean;
  },
): Promise<Response | null> {
  const githubToken =
    options?.notifyWithoutToken === false
      ? readGitHubToken(ctx)
      : getGitHubToken(ctx);
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
  const url = buildGitHubAPIURL(ctx, `/repos/${githubRepository}/pulls`);
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
    buildGitHubAPIURL(ctx, `/repos/${githubRepository}/pulls/${prNumber}`),
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

/**
 * Get the commit of `base` the given commit is derived from, as GitHub computes
 * it — the same `compare` endpoint the server queries for projects that granted
 * it content access.
 *
 * Keyed on the commit that is actually checked out, which makes it right for
 * either shape of pull request build without having to tell them apart: for a
 * test-merge commit it returns the base branch tip merged in (even once the base
 * branch has moved past it), and for the pull request head it returns the fork
 * point, which is the commit those screenshots are derived from.
 *
 * Returns `null` when there is no token, the refs are unknown, or the API is
 * unreachable — every caller has git to fall back on.
 */
export async function getMergeBaseCommitShaFromAPI(
  ctx: Context,
  input: { base: string; head: string },
): Promise<string | null> {
  const githubRepository = getGitHubRepository(ctx);
  if (!githubRepository) {
    return null;
  }

  // Refs can contain slashes, which are path separators here, so the segments
  // are encoded rather than the ref as a whole.
  const encodeRef = (ref: string) =>
    ref.split("/").map(encodeURIComponent).join("/");
  const basehead = `${encodeRef(input.base)}...${encodeRef(input.head)}`;

  debug(`Fetching the merge base of ${basehead} from the GitHub API`);

  const response = await (async () => {
    try {
      return await fetchGitHubAPI(
        ctx,
        buildGitHubAPIURL(
          ctx,
          `/repos/${githubRepository}/compare/${basehead}`,
        ),
        { notifyWithoutToken: false },
      );
    } catch (error) {
      debug("Failed to reach the GitHub API", error);
      return null;
    }
  })();

  if (!response) {
    debug("No GitHub token, falling back to git to find the merge base");
    return null;
  }

  if (!response.ok) {
    // Not fatal: a missing ref, a token without access to the repository, or a
    // rate limit all leave git as the way to answer.
    debug(
      `Non-OK response (status: ${response.status}) while comparing ${basehead}`,
    );
    return null;
  }

  const result: { merge_base_commit?: { sha?: string } } =
    await response.json();
  const sha = result.merge_base_commit?.sha ?? null;
  debug("Merge base from the GitHub API", sha);
  return sha;
}
