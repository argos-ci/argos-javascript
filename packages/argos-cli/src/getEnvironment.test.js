import getEnvironment from "./getEnvironment";

describe("getEnvironment", () => {
  describe("travis", () => {
    let env;

    beforeEach(() => {
      env = {
        TRAVIS: "true",
        TRAVIS_BUILD_ID: "1234",
        TRAVIS_BUILD_NUMBER: "build-number",
        TRAVIS_REPO_SLUG: "travis/repo-slug",
        TRAVIS_PULL_REQUEST: "false",
        TRAVIS_PULL_REQUEST_BRANCH: "",
        TRAVIS_PULL_REQUEST_SHA: "",
        TRAVIS_COMMIT: "travis-commit-sha",
        TRAVIS_BRANCH: "travis-branch",
        CI_NODE_TOTAL: "3",
      };
    });

    it("should work in Push mode", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("travis");
      expect(environment.commit).toBe("travis-commit-sha");
      expect(environment.branch).toBe("travis-branch");
      expect(environment.pullRequestNumber).toBe(null);
    });

    it("should work in PR mode", () => {
      const environment = getEnvironment({
        ...env,
        TRAVIS_PULL_REQUEST: "256",
        TRAVIS_PULL_REQUEST_BRANCH: "travis-pr-branch",
      });
      expect(environment.pullRequestNumber).toBe("256");
      expect(environment.branch).toBe("travis-pr-branch");
      expect(environment.commit).toBe("travis-commit-sha");
    });
  });

  describe("Circle CI", () => {
    let env;

    beforeEach(() => {
      env = {
        CIRCLECI: "true",
        CIRCLE_BRANCH: "circle-branch",
        CIRCLE_SHA1: "circle-commit-sha",
        CIRCLE_PROJECT_USERNAME: "circle",
        CIRCLE_PROJECT_REPONAME: "repo-name",
        CIRCLE_BUILD_NUM: "build-number",
        CIRCLE_NODE_TOTAL: "3",
        CIRCLE_PR_NUMBER: "123",
      };
    });

    it("has the correct properties", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("circleci");
      expect(environment.commit).toBe("circle-commit-sha");
      expect(environment.branch).toBe("circle-branch");
      expect(environment.pullRequestNumber).toBe("123");
    });
  });

  describe("Codeship", () => {
    let env;

    beforeEach(() => {
      env = {
        CI_NAME: "codeship",
        CI_BRANCH: "codeship-branch",
        CI_BUILD_NUMBER: "codeship-build-number",
        CI_PULL_REQUEST: "false", // This is always false right now in Codeship. :|
        CI_COMMIT_ID: "codeship-commit-sha",
        CI_NODE_TOTAL: "3",
      };
    });

    it("has the correct properties", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("codeship");
      expect(environment.commit).toBe("codeship-commit-sha");
      expect(environment.branch).toBe("codeship-branch");
      expect(environment.pullRequestNumber).toBe(null);
    });
  });

  describe("Drone", () => {
    let env;

    beforeEach(() => {
      env = {
        DRONE: "true",
        DRONE_COMMIT_SHA: "drone-commit-sha",
        DRONE_BRANCH: "drone-branch",
        DRONE_PULL_REQUEST: "123",
        DRONE_BUILD_NUMBER: "drone-build-number",
      };
    });

    it("has the correct properties", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("drone");
      expect(environment.commit).toBe("drone-commit-sha");
      expect(environment.branch).toBe("drone-branch");
      expect(environment.pullRequestNumber).toBe("123");
    });
  });

  describe("Semaphore CI", () => {
    let env;

    beforeEach(() => {
      env = {
        SEMAPHORE: "true",
        BRANCH_NAME: "semaphore-branch",
        SEMAPHORE_GIT_SHA: "semaphore-commit-sha",
        SEMAPHORE_REPO_SLUG: "repo-owner/repo-name",
        SEMAPHORE_BUILD_NUMBER: "semaphore-build-number",
        SEMAPHORE_THREAD_COUNT: "2",
        PULL_REQUEST_NUMBER: "123",
      };
    });

    it("has the correct properties", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("semaphore");
      expect(environment.commit).toBe("semaphore-commit-sha");
      expect(environment.branch).toBe("semaphore-branch");
      expect(environment.pullRequestNumber).toBe("123");
    });
  });

  describe("Buildkite", () => {
    let env;

    beforeEach(() => {
      env = {
        BUILDKITE: "true",
        BUILDKITE_COMMIT: "buildkite-commit-sha",
        BUILDKITE_BRANCH: "buildkite-branch",
        BUILDKITE_PULL_REQUEST: "false",
        BUILDKITE_BUILD_ID: "buildkite-build-id",
        BUILDKITE_PARALLEL_JOB_COUNT: "3",
      };
    });

    it("push build has the correct properties", () => {
      const environment = getEnvironment(env);
      expect(environment.ci).toBe("buildkite");
      expect(environment.commit).toBe("buildkite-commit-sha");
      expect(environment.branch).toBe("buildkite-branch");
      expect(environment.pullRequestNumber).toBe(null);
    });

    it("pull request build has the correct properties", () => {
      const environment = getEnvironment({
        ...env,
        BUILDKITE_PULL_REQUEST: "123",
      });
      expect(environment.pullRequestNumber).toBe("123");
    });
  });
});
