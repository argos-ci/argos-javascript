import type { Service } from "../types";

const service: Service = {
  detect: ({ env }) => Boolean(env.HEROKU_TEST_RUN_ID),
  config: ({ env }) => ({
    name: "Heroku",
    commit: env.HEROKU_TEST_RUN_COMMIT_VERSION || null,
    branch: env.HEROKU_TEST_RUN_BRANCH || null,
    owner: null,
    repository: null,
    jobId: env.HEROKU_TEST_RUN_ID || null,
  }),
};

export default service;
