import { existsSync, readFileSync } from "node:fs";
import type { Service, Context } from "../types";
import {
  getCommitParents,
  getMergeBaseCommitSha as getGitMergeBaseCommitSha,
  head as getHeadSha,
  listAncestorCommits,
} from "../git";
import type * as webhooks from "@octokit/webhooks";
import type { RepositoryDispatchContext } from "@vercel/repository-dispatch/context";
import {
  getGitHubRepository,
  getMergeBaseCommitShaFromAPI,
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

function getMergeQueuePrNumbers(args: {
  mergeGroupPayload: MergeGroupEventPayload | null;
  pullRequest: GitHubPullRequest | null;
}): number[] | null {
  const { mergeGroupPayload, pullRequest } = args;

  if (!mergeGroupPayload) {
    return null;
  }

  if (pullRequest) {
    return [pullRequest.number];
  }

  // Preserve the merge queue signal even if PR lookup fails by deriving the
  // PR number from the merge group branch when possible.
  const headRef = mergeGroupPayload.merge_group.head_ref;
  const prNumberFromBranch = getPRNumberFromMergeGroupBranch(headRef);
  if (prNumberFromBranch != null) {
    return [prNumberFromBranch];
  }

  return [];
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
  payload: EventPayload | null,
): string {
  // In "pull_request_target", the GITHUB_SHA is pointing to the base branch,
  // so we use the pull request commit instead.
  if (context.env.GITHUB_EVENT_NAME === "pull_request_target") {
    if (!payload) {
      throw new Error('Payload is missing in "pull_request_target" event');
    }
    const pullRequest = getPullRequestFromPayload(payload);
    if (!pullRequest) {
      throw new Error('Pull request missing in "pull_request_target" event');
    }
    return pullRequest.head.sha;
  }

  if (vercelPayload) {
    return vercelPayload.client_payload.git.sha;
  }

  if (!context.env.GITHUB_SHA) {
    throw new Error("GITHUB_SHA is missing");
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

/**
 * Get the commit of the base branch that GitHub merged into the pull request to
 * run its checks.
 *
 * On a `pull_request` event, GitHub checks out a "test-merge" commit
 * (`refs/pull/<n>/merge`): the pull request head merged into the tip of the base
 * branch. The screenshots of such a build then contain the base branch changes
 * up to that tip, so that tip — the first parent of the test-merge commit — is
 * the commit to compare the build against. Comparing against the merge base
 * instead reports every visual change merged into the base branch since the pull
 * request branch was created as a change of the pull request.
 *
 * Returns `null` when the build does not run on a test-merge commit, in which
 * case the merge base is used: another event, a workflow that checked out
 * something else (e.g. the pull request head itself), a base branch overridden
 * to another branch, or a commit whose parents can't be read.
 */
async function getTestMergeBaseCommitSha(
  input: { base: string },
  ctx: Context,
): Promise<string | null> {
  if (ctx.env.GITHUB_EVENT_NAME !== "pull_request") {
    return null;
  }

  const payload = readEventPayload(ctx);
  const pullRequest = payload ? getPullRequestFromPayload(payload) : null;
  if (!pullRequest) {
    return null;
  }

  // The base used to find the baseline is not the branch the test-merge commit
  // was created from, so its tip tells nothing about the build content.
  if (input.base !== pullRequest.base.ref) {
    debug(
      `Base "${input.base}" is not the pull request base branch "${pullRequest.base.ref}", ignoring the test-merge commit`,
    );
    return null;
  }

  // The screenshots are produced from the commit checked out, so the build must
  // run on it for its parents to tell what the screenshots contain.
  const sha = ctx.env.GITHUB_SHA;
  if (!sha || getHeadSha() !== sha) {
    debug(
      "Not running on the checked out commit, ignoring the test-merge commit",
    );
    return null;
  }

  const mergeRef = `refs/pull/${pullRequest.number}/merge`;
  const parents = getCommitParents(sha);

  // Reported apart from the shape check below: a commit we could not read says
  // nothing about whether it is a test merge, and blaming its shape sends
  // anyone reading the debug output after the wrong thing.
  if (!parents) {
    debug(
      `Could not read the parents of ${sha}, ignoring the test-merge commit`,
    );
    return null;
  }

  // A test-merge commit merges the pull request head (second parent) into the
  // tip of the base branch (first parent).
  if (parents.length !== 2) {
    debug(`${sha} is not a merge commit, ignoring the test-merge commit`);
    return null;
  }

  // `GITHUB_REF` is set by the runner from the ref the run was triggered on, so
  // on a `pull_request` event it names the merge ref itself. Together with the
  // check above that the build runs on `GITHUB_SHA`, it identifies the test
  // merge without reading the payload.
  //
  // The payload can lag behind the merge ref: when a push lands between the
  // event and the merge ref being recomputed, `pull_request.head.sha` still
  // carries the previous head while the checkout is the newer test-merge
  // commit. Comparing the second parent against that stale head then rejects a
  // genuine test-merge build, and the fallback baselines it against the fork
  // point — reporting every change merged into the base branch since as a
  // change of the pull request.
  if (ctx.env.GITHUB_REF === mergeRef) {
    return parents[0] ?? null;
  }

  // Without the merge ref, the payload is the only way to tell GitHub's test
  // merge apart from a merge the author made.
  if (parents[1] !== pullRequest.head.sha) {
    debug(`${sha} is not a test-merge commit of #${pullRequest.number}`);
    return null;
  }

  return parents[0] ?? null;
}

/**
 * Resolve the base commit, preferring GitHub's own answer over anything the
 * local repository can be asked.
 */
async function resolveMergeBaseCommitSha(
  input: { base: string; head: string; headSha: string | null },
  ctx: Context,
): Promise<string | null> {
  // Ask GitHub first. It answers from the real commit graph, so none of the
  // shapes the local repository can take — a shallow clone, a graft hiding the
  // parents, a merge ref recomputed since the run started — can get the answer
  // wrong. Asked about the commit checked out rather than about GITHUB_SHA,
  // which is what makes one query right for both shapes of pull request build:
  // for a test-merge commit it answers with the base branch tip merged in, and
  // for the pull request head with the fork point.
  if (input.headSha) {
    const apiMergeBase = await getMergeBaseCommitShaFromAPI(ctx, {
      base: input.base,
      head: input.headSha,
    });
    if (apiMergeBase) {
      return apiMergeBase;
    }
  }

  const testMergeBase = await getTestMergeBaseCommitSha(input, ctx);
  if (testMergeBase) {
    debug("Found base commit from the test-merge commit", testMergeBase);
    return testMergeBase;
  }
  return getGitMergeBaseCommitSha(input);
}

/**
 * Cache of the resolved base commit, keyed by everything the answer depends on.
 *
 * `upload()` runs once per build name, and every run resolves the same base
 * commit from the same repository and the same commit. Without this, a project
 * with a build name per browser pays for the query — and for the fetches behind
 * the git fallback — once per name.
 */
const mergeBaseCache = new Map<string, Promise<string | null>>();

/**
 * Get the commit to compare the build against: the base commit merged into the
 * test-merge commit when the build runs on one, else the merge base of the
 * branch and its base branch.
 */
async function getMergeBaseCommitSha(
  input: { base: string; head: string },
  ctx: Context,
): Promise<string | null> {
  const headSha = getHeadSha();
  const key = JSON.stringify([
    getGitHubRepository(ctx),
    input.base,
    input.head,
    headSha,
  ]);
  const cached = mergeBaseCache.get(key);
  if (cached) {
    return cached;
  }
  const promise = resolveMergeBaseCommitSha({ ...input, headSha }, ctx);
  mergeBaseCache.set(key, promise);
  return promise;
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
    const sha = getSha(context, vercelPayload, payload);
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
      mergeQueuePrNumbers: getMergeQueuePrNumbers({
        mergeGroupPayload,
        pullRequest,
      }),
    };
  },
  getMergeBaseCommitSha,
  listAncestorCommits,
};

export default service;
