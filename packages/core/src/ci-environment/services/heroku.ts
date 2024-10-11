import type { Service } from "../types";
import { getMergeBaseCommitSha } from "../git";

const service: Service = {
  name: "Heroku",
  key: "heroku",
  detect: ({ env }) => Boolean(env.HEROKU_TEST_RUN_ID),
  config: ({ env }) => ({
    commit: env.HEROKU_TEST_RUN_COMMIT_VERSION || null,
    branch: env.HEROKU_TEST_RUN_BRANCH || null,
    owner: null,
    repository: null,
    jobId: null,
    runId: null,
    runAttempt: null,
    prNumber: null,
    prHeadCommit: null,
    prBaseBranch: null,
    nonce: env.HEROKU_TEST_RUN_ID || null,
  }),
  getMergeBaseCommitSha,
};

export default service;
