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
  detect: ({ env }) => Boolean(env.CIRCLECI),
  config: ({ env }) => {
    return {
      commit: env.CIRCLE_SHA1 || null,
      branch: env.CIRCLE_BRANCH || null,
      owner: env.CIRCLE_PROJECT_USERNAME || null,
      repository: env.CIRCLE_PROJECT_REPONAME || null,
      jobId: null,
      runId: null,
      prNumber: getPrNumber({ env }),
    };
  },
};

export default service;
