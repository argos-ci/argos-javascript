/**
 * Source: https://github.com/percy/percy-js/blob/master/environment.js
 */

function travis(env) {
  let commit;
  let branch;
  const pullRequestNumber =
    env.TRAVIS_PULL_REQUEST !== "false" ? env.TRAVIS_PULL_REQUEST : null;

  if (pullRequestNumber && env.TRAVIS_PULL_REQUEST_SHA) {
    commit = env.TRAVIS_PULL_REQUEST_SHA;
  } else {
    commit = env.TRAVIS_COMMIT;
  }

  if (pullRequestNumber && env.TRAVIS_PULL_REQUEST_BRANCH) {
    branch = env.TRAVIS_PULL_REQUEST_BRANCH;
  } else {
    branch = env.TRAVIS_BRANCH;
  }

  return {
    ci: "travis",
    pullRequestNumber,
    commit,
    branch,
  };
}

function jenkins(env) {
  return {
    ci: "jenkins",
    pullRequestNumber: env.ghprbPullId,
    // Pull Request Builder Plugin OR Git Plugin.
    commit: env.ghprbActualCommit || env.GIT_COMMIT,
    branch: env.ghprbTargetBranch,
  };
}

function circle(env) {
  let pullRequestNumber = null;

  if (env.CI_PULL_REQUESTS && env.CI_PULL_REQUESTS !== "") {
    [pullRequestNumber] = env.CI_PULL_REQUESTS.split("/").slice(-1);
  }

  return {
    ci: "circle",
    pullRequestNumber,
    commit: env.CIRCLE_SHA1,
    branch: env.CIRCLE_BRANCH,
  };
}

function codeship(env) {
  return {
    ci: "codeship",
    // Unfortunately, codeship always returns 'false' for CI_PULL_REQUEST. For now, return null.,
    pullRequestNumber: null,
    commit: env.CI_COMMIT_ID,
    branch: env.CI_BRANCH,
  };
}

function drone(env) {
  return {
    ci: "drone",
    pullRequestNumber: env.CI_PULL_REQUEST,
    commit: env.DRONE_COMMIT,
    branch: env.DRONE_BRANCH,
  };
}

function semaphore(env) {
  return {
    ci: "semaphore",
    pullRequestNumber: env.PULL_REQUEST_NUMBER,
    commit: env.REVISION,
    branch: env.BRANCH_NAME,
  };
}

function buildkite(env) {
  return {
    ci: "buildkite",
    pullRequestNumber:
      env.BUILDKITE_PULL_REQUEST !== "false"
        ? env.BUILDKITE_PULL_REQUEST
        : null,
    // Buildkite mixes SHAs and non-SHAs in BUILDKITE_COMMIT, so we return null if non-SHA.
    commit: env.BUILDKITE_COMMIT !== "HEAD" ? env.BUILDKITE_COMMIT : null,
    branch: env.BUILDKITE_BRANCH,
  };
}

function herokuCi(env) {
  return {
    ci: "heroku",
    commit: env.HEROKU_TEST_RUN_COMMIT_VERSION,
    branch: env.HEROKU_TEST_RUN_BRANCH,
    externalBuildId: env.HEROKU_TEST_RUN_ID,
    batchCount: env.CI_NODE_TOTAL,
  };
}

function getCi(env) {
  if (env.TRAVIS_BUILD_ID) {
    // https://docs.travis-ci.com/user/environment-variables/
    return travis;
  }
  if (env.JENKINS_URL && env.ghprbPullId) {
    // Pull Request Builder plugin.
    return jenkins;
  }
  if (env.CIRCLECI) {
    return circle;
  }
  if (env.CI_NAME && env.CI_NAME === "codeship") {
    return codeship;
  }
  if (env.DRONE === "true") {
    return drone;
  }
  if (env.SEMAPHORE === "true") {
    return semaphore;
  }
  if (env.BUILDKITE === "true") {
    return buildkite;
  }
  if (env.HEROKU_TEST_RUN_ID) {
    return herokuCi;
  }

  return () => ({
    ci: null,
    pullRequestNumber: null,
    commit: null,
    branch: null,
  });
}

function getEnvironment(env) {
  if (!env) {
    throw new Error('The "env" arg is required.');
  }

  const ci = getCi(env);
  return ci(env);
}

export default getEnvironment;
