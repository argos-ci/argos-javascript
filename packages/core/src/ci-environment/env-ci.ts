import envCi from "env-ci";
import type { CiEnvironment, Context } from "./types";

export const getCiEnvironmentFromEnvCi = (
  ctx: Context,
): CiEnvironment | null => {
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
  const prHeadCommit = null;

  return commit
    ? {
        name,
        commit,
        branch,
        owner,
        repository,
        jobId,
        runId,
        prNumber,
        prHeadCommit,
      }
    : null;
};
