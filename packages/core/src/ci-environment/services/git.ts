import type { Service } from "../types";
import {
  head,
  branch,
  checkIsGitRepository,
  getMergeBaseCommitSha,
  listParentCommits,
  getRepositoryURL,
} from "../git";
import { getRepositoryNameFromURL } from "../../util/url";

function getRepository(): string | null {
  const repositoryURL = getRepositoryURL();
  if (!repositoryURL) {
    return null;
  }
  return getRepositoryNameFromURL(repositoryURL);
}

const service: Service = {
  name: "Git",
  key: "git",
  detect: () => checkIsGitRepository(),
  config: () => {
    return {
      commit: head() || null,
      branch: branch() || null,
      repository: getRepository(),
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
  listParentCommits,
};

export default service;
