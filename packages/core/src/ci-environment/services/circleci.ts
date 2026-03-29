import { getMergeBaseCommitSha, listParentCommits } from "../git";
import type { Service, Context } from "../types";

function getPrNumber(context: Context) {
  const { env } = context;
  const matches = /pull\/(\d+)/.exec(env.CIRCLE_PULL_REQUEST || "");
  if (matches) {
    return Number(matches[1]);
  }

  return null;
}

function getRepository(context: Context): string | null {
  const { env } = context;
  if (env.CIRCLE_PR_REPONAME && env.CIRCLE_PR_USERNAME) {
    return `${env.CIRCLE_PR_USERNAME}/${env.CIRCLE_PR_REPONAME}`;
  }
  return getOriginalRepository(context);
}

function getOriginalRepository(context: Context): string | null {
  const { env } = context;
  if (env.CIRCLE_PROJECT_USERNAME && env.CIRCLE_PROJECT_REPONAME) {
    return `${env.CIRCLE_PROJECT_USERNAME}/${env.CIRCLE_PROJECT_REPONAME}`;
  }
  return null;
}

const service: Service = {
  name: "CircleCI",
  key: "circleci",
  detect: ({ env }) => Boolean(env.CIRCLECI),
  config: (context) => {
    const { env } = context;
    return {
      commit: env.CIRCLE_SHA1 || null,
      branch: env.CIRCLE_BRANCH || null,
      repository: getRepository(context),
      originalRepository: getOriginalRepository(context),
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: getPrNumber({ env }),
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: env.CIRCLE_WORKFLOW_ID || env.CIRCLE_BUILD_NUM || null,
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
