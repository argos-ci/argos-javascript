import type { Context, Service } from "../types";
import {
  head,
  branch,
  getMergeBaseCommitSha,
  listAncestorCommits,
} from "../git";
import { getRepositoryNameFromURL } from "../../util/url";

function getRepository(context: Context): string | null {
  const { env } = context;
  if (env.BUILDKITE_REPO) {
    return getRepositoryNameFromURL(env.BUILDKITE_REPO);
  }
  return null;
}

/**
 * `BUILDKITE_COMMIT` is what the build was created with, not necessarily a
 * SHA: a build started from the UI without a commit carries the literal
 * `HEAD`. Only a full SHA is worth trusting over the checkout.
 */
function getCommit(env: Context["env"]): string | null {
  const commit = env.BUILDKITE_COMMIT;
  if (commit && /^[0-9a-f]{40}$/.test(commit)) {
    return commit;
  }
  return head() || null;
}

const service: Service = {
  name: "Buildkite",
  key: "buildkite",
  detect: ({ env }) => Boolean(env.BUILDKITE),
  config: (context) => {
    const { env } = context;
    const repository = getRepository(context);
    return {
      // Buildkite doesn't work well so we fallback to git to ensure we have commit and branch
      commit: getCommit(env),
      branch: env.BUILDKITE_BRANCH || branch() || null,
      repository,
      originalRepository: repository,
      jobId: null,
      runId: null,
      runAttempt: null,
      // The literal `false` outside a pull request.
      prNumber: /^\d+$/.test(env.BUILDKITE_PULL_REQUEST ?? "")
        ? Number(env.BUILDKITE_PULL_REQUEST)
        : null,
      prHeadCommit: null,
      prBaseBranch: env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
      nonce: env.BUILDKITE_BUILD_ID || null,
    };
  },
  getMergeBaseCommitSha,
  listAncestorCommits,
};

export default service;
