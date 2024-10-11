import { getMergeBaseCommitSha } from "../git";
import type { Service } from "../types";

const service: Service = {
  name: "GitLab",
  key: "gitlab",
  detect: ({ env }) => env.GITLAB_CI === "true",
  config: ({ env }) => {
    return {
      commit: env.CI_COMMIT_SHA || null,
      branch: env.CI_COMMIT_REF_NAME || null,
      owner: null,
      repository: null,
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
};

export default service;
