import envCi from "env-ci";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";
import type { CiEnvironment, Options } from "./types";

export { CiEnvironment };

const services = [heroku, githubActions];

export const getCiEnvironment = ({
  env = process.env,
}: Options = {}): CiEnvironment | null => {
  const ctx = { env };
  const service = services.find((service) => service.detect(ctx));

  // Internal service matched
  if (service) {
    return service.config(ctx);
  }

  // Fallback on env-ci detection
  const ciContext = envCi(ctx);
  const name = ciContext.isCi
    ? ciContext.name ?? null
    : ciContext.commit
    ? "Git"
    : null;
  const commit = ciContext.commit ?? null;
  const branch = ciContext.branch ?? null;

  return commit ? { name, commit, branch } : null;
};
