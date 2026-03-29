import type { Context, Service } from "../types";
import { head, branch, getMergeBaseCommitSha, listParentCommits } from "../git";
import { getRepositoryNameFromURL } from "../../util/url";

function getRepository(context: Context): string | null {
  const { env } = context;
  if (env.BUILDKITE_REPO) {
    return getRepositoryNameFromURL(env.BUILDKITE_REPO);
  }
  return null;
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
      commit: env.BUILDKITE_COMMIT || head() || null,
      branch: env.BUILDKITE_BRANCH || branch() || null,
      repository,
      originalRepository: repository,
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: env.BUILDKITE_PULL_REQUEST
        ? Number(env.BUILDKITE_PULL_REQUEST)
        : null,
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: env.BUILDKITE_BUILD_ID || null,
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
