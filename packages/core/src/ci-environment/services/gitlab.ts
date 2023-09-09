import type { Service } from "../types";

const service: Service = {
  name: "GitLab",
  detect: ({ env }) => env.GITLAB_CI === "true",
  config: ({ env }) => {
    return {
      commit: env.CI_COMMIT_SHA || null,
      branch: env.CI_COMMIT_REF_NAME || null,
      owner: null,
      repository: null,
      jobId: null,
      runId: null,
      prNumber: null,
      prHeadCommit: null,
    };
  },
};

export default service;
