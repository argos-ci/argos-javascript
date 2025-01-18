import { existsSync, readFileSync } from "node:fs";
import type { Service, Context } from "../types";
import axios from "axios";
import { debug } from "../../debug";
import { getMergeBaseCommitSha, listParentCommits } from "../git";
import type * as webhooks from "@octokit/webhooks";

type EventPayload = webhooks.EmitterWebhookEvent["payload"];

type GitHubPullRequest = {
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
 * Get a pull request from a head sha.
 * Fetch the last 30 pull requests sorted by updated date
 * then try to find the one that matches the head sha.
 * If no pull request is found, return null.
 */
async function getPullRequestFromHeadSha({ env }: Context, sha: string) {
  debug("Fetching pull request number from head sha", sha);
  if (!env.GITHUB_REPOSITORY) {
    throw new Error("GITHUB_REPOSITORY is missing");
  }
  if (!env.GITHUB_TOKEN) {
    // For security reasons, people doesn't want to expose their GITHUB_TOKEN
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
  try {
    const result = await axios.get<GitHubPullRequest[]>(
      `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/pulls`,
      {
        params: {
          state: "open",
          sort: "updated",
          per_page: 30,
          page: 1,
        },
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (result.data.length === 0) {
      debug("Aborting because no pull request found");
      return null;
    }
    const matchingPr = result.data.find((pr) => pr.head.sha === sha);
    if (matchingPr) {
      debug("Pull request found", matchingPr);
      return matchingPr;
    }
    debug("Aborting because no pull request found");
    return null;
  } catch (error) {
    debug("Error while fetching pull request from head sha", error);
    return null;
  }
}

function getBranchFromContext(context: Context): string | null {
  const { env } = context;

  if (env.GITHUB_HEAD_REF) {
    return env.GITHUB_HEAD_REF;
  }

  if (!env.GITHUB_REF) {
    return null;
  }

  const branchRegex = /refs\/heads\/(.*)/;
  const matches = branchRegex.exec(env.GITHUB_REF);
  return matches?.[1] ?? null;
}

function getBranchFromPayload(payload: EventPayload): string | null {
  if ("workflow_run" in payload && payload.workflow_run) {
    return payload.workflow_run.head_branch;
  }

  // If the event is a deployment, we can use the environment as branch name.
  if ("deployment" in payload && payload.deployment) {
    return payload.deployment.environment;
  }

  return null;
}

function getRepositoryFromContext({ env }: Context): string | null {
  if (!env.GITHUB_REPOSITORY) {
    return null;
  }
  return env.GITHUB_REPOSITORY.split("/")[1] || null;
}

function readEventPayload({ env }: Context): EventPayload | null {
  if (!env.GITHUB_EVENT_PATH) {
    return null;
  }
  if (!existsSync(env.GITHUB_EVENT_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf-8"));
}

/**
 * Get the pull request from an event payload.
 */
function getPullRequestFromPayload(
  payload: EventPayload,
): GitHubPullRequest | null {
  if (
    "pull_request" in payload &&
    payload.pull_request &&
    payload.pull_request
  ) {
    return payload.pull_request;
  }

  if (
    "workflow_run" in payload &&
    payload.workflow_run &&
    payload.workflow_run.pull_requests[0]
  ) {
    return payload.workflow_run.pull_requests[0];
  }

  if (
    "check_run" in payload &&
    payload.check_run &&
    "pull_requests" in payload.check_run &&
    payload.check_run.pull_requests[0]
  ) {
    return payload.check_run.pull_requests[0];
  }

  return null;
}

const service: Service = {
  name: "GitHub Actions",
  key: "github-actions",
  detect: (context) => Boolean(context.env.GITHUB_ACTIONS),
  config: async (context) => {
    const { env } = context;
    const payload = readEventPayload(context);
    const sha = process.env.GITHUB_SHA || null;

    if (!sha) {
      throw new Error(`GITHUB_SHA is missing`);
    }

    const pullRequest = payload
      ? getPullRequestFromPayload(payload)
      : await getPullRequestFromHeadSha(context, sha);

    return {
      commit: sha,
      owner: env.GITHUB_REPOSITORY_OWNER || null,
      repository: getRepositoryFromContext(context),
      jobId: env.GITHUB_JOB || null,
      runId: env.GITHUB_RUN_ID || null,
      runAttempt: env.GITHUB_RUN_ATTEMPT
        ? Number(env.GITHUB_RUN_ATTEMPT)
        : null,
      nonce: `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
      branch:
        getBranchFromContext(context) ||
        pullRequest?.head.ref ||
        (payload ? getBranchFromPayload(payload) : null) ||
        null,
      prNumber: pullRequest?.number || null,
      prHeadCommit: pullRequest?.head.sha ?? null,
      prBaseBranch: pullRequest?.base.ref ?? null,
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
