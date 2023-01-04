import type { Service } from "../types";
import { envCiDetection } from "../index";

const service: Service = {
  detect: ({ env }) => Boolean(env.BUILDKITE),
  config: ({ env }) => {
    const ciProps = envCiDetection({ env });

    return {
      name: "Buildkite",
      commit: ciProps?.commit || null,
      branch: env.BUILDKITE_BRANCH || null,
      owner: env.BUILDKITE_ORGANIZATION_SLUG || null,
      repository: env.BUILDKITE_PROJECT_SLUG || null,
      jobId: env.BUILDKITE_JOB_ID || null,
      runId: ciProps?.runId || null,
      prNumber: env.BUILDKITE_PULL_REQUEST || null,
    };
  },
};

export default service;
