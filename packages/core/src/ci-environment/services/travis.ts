import type { Context, Service } from "../types";
import { getMergeBaseCommitSha, listParentCommits } from "../git";

function getRepository(context: Context): string | null {
  const { env } = context;

  if (env.TRAVIS_PULL_REQUEST_SLUG) {
    // If this is a pull request from a fork, use the PR slug
    return env.TRAVIS_PULL_REQUEST_SLUG;
  }

  return getOriginalRepository(context);
}

function getOriginalRepository(context: Context): string | null {
  const { env } = context;
  return env.TRAVIS_REPO_SLUG || null;
}

function getPrNumber(context: Context): number | null {
  const { env } = context;
  if (env.TRAVIS_PULL_REQUEST) {
    return Number(env.TRAVIS_PULL_REQUEST);
  }
  return null;
}

const service: Service = {
  name: "Travis CI",
  key: "travis",
  detect: ({ env }) => Boolean(env.TRAVIS),
  config: (ctx) => {
    const { env } = ctx;

    return {
      commit: env.TRAVIS_COMMIT || null,
      branch: env.TRAVIS_BRANCH || null,
      repository: getRepository(ctx),
      originalRepository: getOriginalRepository(ctx),
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
