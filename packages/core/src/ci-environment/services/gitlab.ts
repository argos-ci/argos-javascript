import { getMergeBaseCommitSha, listParentCommits } from "../git";
import type { Context, Service } from "../types";

function getRepository(context: Context): string | null {
  const { env } = context;

  // Merge request from a fork
  if (env.CI_MERGE_REQUEST_PROJECT_PATH) {
    return env.CI_MERGE_REQUEST_PROJECT_PATH;
  }

  return getOriginalRepository(context);
}

function getOriginalRepository(context: Context): string | null {
  const { env } = context;
  return env.CI_PROJECT_PATH || null;
}

const service: Service = {
  name: "GitLab",
  key: "gitlab",
  detect: ({ env }) => env.GITLAB_CI === "true",
  config: (context) => {
    const { env } = context;
    return {
      commit: env.CI_COMMIT_SHA || null,
      branch: env.CI_COMMIT_REF_NAME || null,
      repository: getRepository(context),
      originalRepository: getOriginalRepository(context),
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: null,
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: env.CI_PIPELINE_ID || null,
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
