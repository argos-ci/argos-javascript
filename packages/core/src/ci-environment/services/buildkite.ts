import type { Service } from "../types";
import { head, branch } from "../git";

const service: Service = {
  name: "Buildkite",
  detect: ({ env }) => Boolean(env.BUILDKITE),
  config: ({ env }) => {
    return {
      // Buildkite doesn't work well so we fallback to git to ensure we have commit and branch
      commit: env.BUILDKITE_COMMIT || head() || null,
      branch: env.BUILDKITE_BRANCH || branch() || null,
      owner: env.BUILDKITE_ORGANIZATION_SLUG || null,
      repository: env.BUILDKITE_PROJECT_SLUG || null,
      jobId: null,
      runId: null,
      prNumber: env.BUILDKITE_PULL_REQUEST
        ? Number(env.BUILDKITE_PULL_REQUEST)
        : null,
    };
  },
};

export default service;
