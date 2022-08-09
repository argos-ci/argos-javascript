import envCi from "env-ci";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";

const services = [heroku, githubActions];

export const getEnvironment = ({ env = process.env }) => {
  const ctx = { env };
  const service = services.find((service) => service.detect(ctx));

  // Internal service matched
  if (service) {
    return service.config(ctx);
  }

  // Fallback on env-ci detection
  const { name, commit, branch, prBranch } = envCi(ctx);
  return {
    name: name || null,
    commit: commit || null,
    branch: prBranch || branch || null,
  };
};
