import { getMergeBaseCommitSha, listParentCommits } from "../git";
import type { Service, Context } from "../types";

function getPrNumber(context: Context) {
  const { env } = context;
  return env.BITRISE_PULL_REQUEST ? Number(env.BITRISE_PULL_REQUEST) : null;
}

function getRepository(context: Context): string | null {
  const { env } = context;
  if (env.BITRISEIO_GIT_REPOSITORY_OWNER && env.BITRISEIO_GIT_REPOSITORY_SLUG) {
    return `${env.BITRISEIO_GIT_REPOSITORY_OWNER}/${env.BITRISEIO_GIT_REPOSITORY_SLUG}`;
  }
  return null;
}

const service: Service = {
  name: "Bitrise",
  key: "bitrise",
  detect: ({ env }) => Boolean(env.BITRISE_IO),
  config: (context) => {
    const { env } = context;
    return {
      commit: env.BITRISE_GIT_COMMIT || null,
      branch: env.BITRISE_GIT_BRANCH || null,
      repository: getRepository(context),
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
  listParentCommits,
};

export default service;
