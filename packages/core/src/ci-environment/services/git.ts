import type { Service } from "../types";
import {
  head,
  branch,
  checkIsGitRepository,
  getMergeBaseCommitSha,
} from "../git";

const service: Service = {
  name: "Git",
  key: "git",
  detect: () => checkIsGitRepository(),
  config: () => {
    return {
      commit: head() || null,
      branch: branch() || null,
      owner: null,
      repository: null,
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: null,
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: null,
    };
  },
  getMergeBaseCommitSha,
};

export default service;
