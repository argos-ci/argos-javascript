import type { Service } from "../types";
import { envCiDetection } from "../index";

const service: Service = {
  name: "Travis CI",
  detect: ({ env }) => Boolean(env.TRAVIS),
  config: ({ env }) => {
    const ciProps = envCiDetection({ env });

    return {
      commit: ciProps?.commit || null,
      branch: ciProps?.branch || null,
      owner: ciProps?.owner || null,
      repository: ciProps?.repository || null,
      jobId: ciProps?.jobId || null,
      runId: ciProps?.runId || null,
      prNumber: env.TRAVIS_PULL_REQUEST
        ? Number(env.TRAVIS_PULL_REQUEST)
        : null,
    };
  },
};

export default service;
