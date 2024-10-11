import { getMergeBaseCommitSha } from "../git";
import type { Service, Context } from "../types";

const getPrNumber = ({ env }: Context) => {
  return env.BITRISE_PULL_REQUEST ? Number(env.BITRISE_PULL_REQUEST) : null;
};

const service: Service = {
  name: "Bitrise",
  key: "bitrise",
  detect: ({ env }) => Boolean(env.BITRISE_IO),
  config: ({ env }) => {
    return {
      commit: env.BITRISE_GIT_COMMIT || null,
      branch: env.BITRISE_GIT_BRANCH || null,
      owner: env.BITRISEIO_GIT_REPOSITORY_OWNER || null,
      repository: env.BITRISEIO_GIT_REPOSITORY_SLUG || null,
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: getPrNumber({ env }),
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: env.BITRISEIO_PIPELINE_ID || null,
    };
  },
  getMergeBaseCommitSha,
};

export default service;
