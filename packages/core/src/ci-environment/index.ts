import envCi from "env-ci";
import buildkite from "./services/buildkite";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";
import circleci from "./services/circleci";
import travis from "./services/travis";
import type { CiEnvironment, Options, Context } from "./types";

export { CiEnvironment };

const services = [heroku, githubActions, circleci, travis, buildkite];

export const envCiDetection = (ctx: Context) => {
  const ciContext = envCi(ctx);
  const name = ciContext.isCi
    ? ciContext.name ?? null
    : ciContext.commit
    ? "Git"
    : null;
  const commit = ciContext.commit ?? null;
  const branch = (ciContext.branch || ciContext.prBranch) ?? null;
  const slug = ciContext.slug ? ciContext.slug.split("/") : null;
  const owner = slug ? slug[0] : null;
  const repository = slug ? slug[1] : null;
  const jobId = ciContext.job ?? null;
  const runId = null;
  const prNumber = null;

  return commit
    ? { name, commit, branch, owner, repository, jobId, runId, prNumber }
    : null;
};

export const getCiEnvironment = ({
  env = process.env,
}: Options = {}): CiEnvironment | null => {
  const ctx = { env };
  const service = services.find((service) => service.detect(ctx));

  // Internal service matched
  if (service) {
    return service.config(ctx);
  }

  return envCiDetection(ctx);
};
