import { existsSync, readFileSync } from "node:fs";
import type { Service, Context } from "../types";
import axios from "axios";
import { debug } from "../../debug";

type EventPayload = {
  pull_request?: {
    head: {
      sha: string;
      ref: string;
    };
    number: number;
  };
  deployment?: {
    sha: string;
    environment: string;
  };
};

type GitHubPullRequest = {
  number: number;
  head: {
    ref: string;
    sha: string;
  };
};

/**
 * When triggered by a deployment we try to get the pull request number from the
 * deployment sha.
 */
async function getPullRequestFromHeadSha({ env }: Context, sha: string) {
  debug("Fetching pull request number from head sha", sha);
  if (!env.GITHUB_REPOSITORY) {
    throw new Error("GITHUB_REPOSITORY is missing");
  }
  if (!env.GITHUB_TOKEN) {
    if (!env.DISABLE_GITHUB_TOKEN_WARNING) {
      console.log(
        `
Running argos from a "deployment_status" event requires a GITHUB_TOKEN.
Please add \`GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\` as environment variable.

Read more at https://argos-ci.com/docs/run-on-preview-deployment

To disable this warning, add \`DISABLE_GITHUB_TOKEN_WARNING: true\` as environment variable.
`.trim(),
      );
    }
    return null;
  }
  try {
    const result = await axios.get<GitHubPullRequest[]>(
      `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/pulls`,
      {
        params: {
          head: sha,
        },
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (result.data.length === 0) {
      debug("Aborting because no pull request found");
      return null;
    }
    const firstPr = result.data[0];
    debug("PR found", firstPr);
    return firstPr;
  } catch (error) {
    debug("Error while fetching pull request from head sha", error);
    return null;
  }
}

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

const readEventPayload = ({ env }: Context): EventPayload | null => {
  if (!env.GITHUB_EVENT_PATH) return null;
  if (!existsSync(env.GITHUB_EVENT_PATH)) return null;
  return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf-8"));
};

const service: Service = {
  name: "GitHub Actions",
  detect: ({ env }) => Boolean(env.GITHUB_ACTIONS),
  config: async ({ env }) => {
    const payload = readEventPayload({ env });
    const sha = process.env.GITHUB_SHA || null;

    if (!sha) {
      throw new Error(`GITHUB_SHA is missing`);
    }

    const commonConfig = {
      commit: sha,
      owner: env.GITHUB_REPOSITORY_OWNER || null,
      repository: getRepository({ env }),
      jobId: env.GITHUB_JOB || null,
      runId: env.GITHUB_RUN_ID || null,
      nonce: `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}` || null,
    };

    // If the job is triggered by from a "deployment" or a "deployment_status"
    if (payload?.deployment) {
      debug("Deployment event detected");
      const pullRequest = await getPullRequestFromHeadSha({ env }, sha);
      return {
        ...commonConfig,
        branch: pullRequest?.head.ref || payload.deployment.environment || null,
        prNumber: pullRequest?.number || null,
        prHeadCommit: pullRequest?.head.sha || null,
      };
    }

    return {
      ...commonConfig,
      branch: payload?.pull_request?.head.ref || getBranch({ env }) || null,
      prNumber: payload?.pull_request?.number || null,
      prHeadCommit: payload?.pull_request?.head.sha ?? null,
    };
  },
};

export default service;
