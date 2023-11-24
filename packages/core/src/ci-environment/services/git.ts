import type { Service } from "../types";
import { head, branch, checkIsGitRepository } from "../git";

const service: Service = {
  name: "Git",
  detect: () => checkIsGitRepository(),
  config: () => {
    return {
      commit: head() || null,
      branch: branch() || null,
      owner: null,
      repository: null,
      jobId: null,
      runId: null,
      prNumber: null,
      prHeadCommit: null,
      nonce: null,
    };
  },
};

export default service;
