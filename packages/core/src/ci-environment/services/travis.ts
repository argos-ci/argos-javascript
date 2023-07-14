import type { Context, Service } from "../types";

const getOwner = ({ env }: Context) => {
  if (!env.TRAVIS_REPO_SLUG) return null;
  return env.TRAVIS_REPO_SLUG.split("/")[0] || null;
};

const getRepository = ({ env }: Context) => {
  if (!env.TRAVIS_REPO_SLUG) return null;
  return env.TRAVIS_REPO_SLUG.split("/")[1] || null;
};

const getPrNumber = ({ env }: Context) => {
  if (env.TRAVIS_PULL_REQUEST) return Number(env.TRAVIS_PULL_REQUEST);
  return null;
};

const service: Service = {
  name: "Travis CI",
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
      prNumber: getPrNumber(ctx),
      prHeadCommit: null,
    };
  },
};

export default service;
