import { existsSync, readFileSync } from "node:fs";
import type { Service, Context } from "../types";

const getBranch = ({ env }: Context) => {
  if (env.GITHUB_HEAD_REF) {
    return env.GITHUB_HEAD_REF;
  }

  const branchRegex = /refs\/heads\/(.*)/;
  const matches = branchRegex.exec(env.GITHUB_REF || "");
  if (matches) {
    return matches[1];
  }

  return null;
};

const getRepository = ({ env }: Context) => {
  if (!env.GITHUB_REPOSITORY) return null;
  return env.GITHUB_REPOSITORY.split("/")[1];
};

interface EventPayload {
  pull_request?: {
    head: {
      sha: string;
      ref: string;
    };
    number: number;
  };
}

const readEventPayload = ({ env }: Context): EventPayload | null => {
  if (!env.GITHUB_EVENT_PATH) return null;
  if (!existsSync(env.GITHUB_EVENT_PATH)) return null;
  return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf-8"));
};

const service: Service = {
  name: "GitHub Actions",
  detect: ({ env }) => Boolean(env.GITHUB_ACTIONS),
  config: ({ env }) => {
    const payload = readEventPayload({ env });
    return {
      commit: process.env.GITHUB_SHA || null,
      branch: payload?.pull_request?.head.ref || getBranch({ env }) || null,
      owner: env.GITHUB_REPOSITORY_OWNER || null,
      repository: getRepository({ env }),
      jobId: env.GITHUB_JOB || null,
      runId: env.GITHUB_RUN_ID || null,
      prNumber: payload?.pull_request?.number || null,
      prHeadCommit: payload?.pull_request?.head.sha ?? null,
      nonce: `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}` || null,
    };
  },
};

export default service;
