import { existsSync, readFileSync } from "node:fs";
import type { Service, Context } from "../types";
import { getMergeBaseCommitSha, listParentCommits } from "../git";
import type * as webhooks from "@octokit/webhooks";
import type { RepositoryDispatchContext } from "@vercel/repository-dispatch/context";
import {
  getGitHubRepository,
  getPRNumberFromMergeGroupBranch,
  getPullRequestFromHeadSha,
  getPullRequestFromPrNumber,
  type GitHubPullRequest,
} from "../github";
import { debug } from "../../debug";

type EventPayload = webhooks.EmitterWebhookEvent["payload"];

/**
 * Read the event payload.
 */
function readEventPayload({ env }: Context): null | EventPayload {
  if (!env.GITHUB_EVENT_PATH) {
    return null;
  }

  if (!existsSync(env.GITHUB_EVENT_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf-8"));
}

type VercelDeploymentPayload = RepositoryDispatchContext["payload"];

/**
 * Get a payload from a Vercel deployment "repository_dispatch"
 * @see https://vercel.com/docs/git/vercel-for-github#repository-dispatch-events
 */
function getVercelDeploymentPayload(
  payload: EventPayload | null,
): VercelDeploymentPayload | null {
  if (
    process.env.GITHUB_EVENT_NAME === "repository_dispatch" &&
    payload &&
    "action" in payload &&
    payload.action === "vercel.deployment.success"
  ) {
    return payload as unknown as VercelDeploymentPayload;
  }
  return null;
}

type MergeGroupEventPayload =
  webhooks.EmitterWebhookEvent<"merge_group.checks_requested">["payload"];

/**
 * Get a merge group payload from a "merge_group" event.
 */
function getMergeGroupPayload(
  payload: EventPayload | null,
): MergeGroupEventPayload | null {
  if (
    payload &&
    process.env.GITHUB_EVENT_NAME === "merge_group" &&
    "action" in payload &&
    payload.action === "checks_requested"
  ) {
    return payload as unknown as webhooks.EmitterWebhookEvent<"merge_group.checks_requested">["payload"];
  }

  return null;
}

/**
 * Get the branch from the local context.
 */
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

/**
 * Get the branch from the payload.
 */
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

/**
 * Get the branch.
 */
function getBranch(args: {
  payload: EventPayload | null;
  mergeGroupPayload: MergeGroupEventPayload | null;
  vercelPayload: VercelDeploymentPayload | null;
  pullRequest: GitHubPullRequest | null;
  context: Context;
}) {
  const { payload, mergeGroupPayload, vercelPayload, pullRequest, context } =
    args;

  // If there's a merge group and a PR detected, use the PR branch.
  if (mergeGroupPayload && pullRequest?.head.ref) {
    return pullRequest.head.ref;
  }

  // If there's a Vercel payload, use it.
  if (vercelPayload) {
    return vercelPayload.client_payload.git.ref;
  }

  // Or from the payload.
  if (payload) {
    const fromPayload = getBranchFromPayload(payload);
    if (fromPayload) {
      return fromPayload;
    }
  }

  // Or from the context (environment variables).
  const fromContext = getBranchFromContext(context);
  if (fromContext) {
    return fromContext;
  }

  // Or from the PR if available.
  if (pullRequest) {
    return pullRequest.head.ref;
  }

  return null;
}

/**
 * Get the repository either from payload or from environment variables.
 */
function getRepository(
  context: Context,
  payload: EventPayload | null,
): string | null {
  // If PR from fork
  if (payload && "pull_request" in payload && payload.pull_request) {
    const pr = payload.pull_request;
    if (pr.head && pr.head.repo && pr.head.repo.full_name) {
      return pr.head.repo.full_name;
    }
  }

  return getGitHubRepository(context);
}

/**
 * Get the head sha.
 */
function getSha(
  context: Context,
  vercelPayload: VercelDeploymentPayload | null,
): string {
  if (vercelPayload) {
    return vercelPayload.client_payload.git.sha;
  }

  if (!context.env.GITHUB_SHA) {
    throw new Error(`GITHUB_SHA is missing`);
  }

  return context.env.GITHUB_SHA;
}

/**
 * Get the pull request from an event payload.
 */
function getPullRequestFromPayload(payload: EventPayload) {
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

/**
 * Get the pull request either from payload or local fetching.
 */
async function getPullRequest(args: {
  payload: EventPayload | null;
  vercelPayload: VercelDeploymentPayload | null;
  mergeGroupPayload: MergeGroupEventPayload | null;
  context: Context;
  sha: string;
}) {
  const { payload, vercelPayload, mergeGroupPayload, context, sha } = args;

  if (vercelPayload || !payload) {
    return getPullRequestFromHeadSha(context, sha);
  }

  if (mergeGroupPayload) {
    const prNumber = getPRNumberFromMergeGroupBranch(
      mergeGroupPayload.merge_group.head_ref,
    );
    if (!prNumber) {
      debug(
        `No PR found from merge group head ref: ${mergeGroupPayload.merge_group.head_ref}`,
      );
      return null;
    }
    debug(
      `PR #${prNumber} found from merge group head ref (${mergeGroupPayload.merge_group.head_ref})`,
    );
    return getPullRequestFromPrNumber(context, prNumber);
  }

  return getPullRequestFromPayload(payload);
}

const service: Service = {
  name: "GitHub Actions",
  key: "github-actions",
  detect: (context) => Boolean(context.env.GITHUB_ACTIONS),
  config: async (context) => {
    const { env } = context;
    const payload = readEventPayload(context);
    const vercelPayload = getVercelDeploymentPayload(payload);
    const mergeGroupPayload = getMergeGroupPayload(payload);
    const sha = getSha(context, vercelPayload);
    const pullRequest = await getPullRequest({
      payload,
      vercelPayload,
      mergeGroupPayload,
      sha,
      context,
    });
    const branch = getBranch({
      payload,
      vercelPayload,
      mergeGroupPayload,
      context,
      pullRequest,
    });

    return {
      commit: sha,
      repository: getRepository(context, payload),
      originalRepository: getGitHubRepository(context),
      jobId: env.GITHUB_JOB || null,
      runId: env.GITHUB_RUN_ID || null,
      runAttempt: env.GITHUB_RUN_ATTEMPT
        ? Number(env.GITHUB_RUN_ATTEMPT)
        : null,
      nonce: `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
      branch,
      prNumber: pullRequest?.number || null,
      prHeadCommit: pullRequest?.head.sha ?? null,
      prBaseBranch: pullRequest?.base.ref ?? null,
      mergeQueue: Boolean(mergeGroupPayload),
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
