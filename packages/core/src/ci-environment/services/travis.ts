import type { Context, Service } from "../types";
import { getMergeBaseCommitSha, listParentCommits } from "../git";

const getOwner = ({ env }: Context) => {
  if (!env.TRAVIS_REPO_SLUG) {
    return null;
  }
  return env.TRAVIS_REPO_SLUG.split("/")[0] || null;
};

const getRepository = ({ env }: Context) => {
  if (!env.TRAVIS_REPO_SLUG) {
    return null;
  }
  return env.TRAVIS_REPO_SLUG.split("/")[1] || null;
};

const getPrNumber = ({ env }: Context) => {
  if (env.TRAVIS_PULL_REQUEST) {
    return Number(env.TRAVIS_PULL_REQUEST);
  }
  return null;
};

const service: Service = {
  name: "Travis CI",
  key: "travis",
  detect: ({ env }) => Boolean(env.TRAVIS),
  config: (ctx) => {
    const { env } = ctx;

    return {
      commit: env.TRAVIS_COMMIT || null,
      branch: env.TRAVIS_BRANCH || null,
      owner: getOwner(ctx),
      repository: getRepository(ctx),
      jobId: null,
      runId: null,
      runAttempt: null,
      prNumber: getPrNumber(ctx),
      prHeadCommit: null,
      prBaseBranch: null,
      nonce: env.TRAVIS_BUILD_ID || null,
    };
  },
  getMergeBaseCommitSha,
  listParentCommits,
};

export default service;
