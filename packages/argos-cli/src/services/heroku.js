export default {
  detect: ({ env }) => Boolean(env.HEROKU_TEST_RUN_ID),
  config: ({ env }) => ({
    name: "Heroku",
    commit: env.HEROKU_TEST_RUN_COMMIT_VERSION || null,
    branch: env.HEROKU_TEST_RUN_BRANCH || null,
  }),
};
