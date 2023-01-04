import type { Service, Context } from "../types";
import { envCiDetection } from "../index";

const getPrNumber = ({ env }: Context) => {
  const branchRegex = /pull\/(\d+)/;
  const branchMatches = branchRegex.exec(env.CIRCLE_PULL_REQUEST || "");
  if (branchMatches) {
    return Number(branchMatches[1]);
  }

  return null;
};

const service: Service = {
  detect: ({ env }) => Boolean(env.CIRCLECI),
  config: ({ env }) => {
    const ciProps = envCiDetection({ env });

    return {
      name: "CircleCI",
      commit: ciProps?.commit || null,
      branch: ciProps?.branch || null,
      owner: ciProps?.owner || null,
      repository: ciProps?.repository || null,
      jobId: ciProps?.jobId || null,
      runId: ciProps?.runId || null,
      prNumber: getPrNumber({ env }),
    };
  },
};

export default service;
