const envCi = require("env-ci");

const getEnvironment = (env = process.env) => {
  // Heroku
  if (env.HEROKU_TEST_RUN_ID) {
    return {
      ci: "heroku",
      commit: env.HEROKU_TEST_RUN_COMMIT_VERSION || null,
      branch: env.HEROKU_TEST_RUN_BRANCH || null,
      externalBuildId: env.HEROKU_TEST_RUN_ID || null,
      batchCount: env.CI_NODE_TOTAL || null,
    };
  }

  const { service, pr, commit, branch, prBranch } = envCi({ env });
  return {
    ci: service || null,
    pullRequestNumber: pr || null,
    commit: commit || null,
    branch: prBranch || branch || null,
    externalBuildId: null,
    batchCount: null,
  };
};

export default getEnvironment;
