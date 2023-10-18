import type { Service } from "../types";
import { head, branch, checkIsGitRepository } from "../git";

const service: Service = {
  name: "Git",
  detect: () => checkIsGitRepository(),
  config: () => {
    return {
      // Buildkite doesn't work well so we fallback to git to ensure we have commit and branch
      commit: head() || null,
      branch: branch() || null,
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
