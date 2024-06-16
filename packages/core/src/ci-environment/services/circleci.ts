import type { Service, Context } from "../types";

const getPrNumber = ({ env }: Context) => {
  const branchRegex = /pull\/(\d+)/;
  const matches = branchRegex.exec(env.CIRCLE_PULL_REQUEST || "");
  if (matches) {
    return Number(matches[1]);
  }

  return null;
};

const service: Service = {
  name: "CircleCI",
  key: "circleci",
  detect: ({ env }) => Boolean(env.CIRCLECI),
  config: ({ env }) => {
    return {
      commit: env.CIRCLE_SHA1 || null,
      branch: env.CIRCLE_BRANCH || null,
      owner: env.CIRCLE_PROJECT_USERNAME || null,
      repository: env.CIRCLE_PROJECT_REPONAME || null,
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: getPrNumber({ env }),
      prHeadCommit: null,
      nonce: env.CIRCLE_WORKFLOW_ID || env.CIRCLE_BUILD_NUM || null,
    };
  },
};

export default service;
