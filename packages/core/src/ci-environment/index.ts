import bitrise from "./services/bitrise";
import buildkite from "./services/buildkite";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";
import circleci from "./services/circleci";
import travis from "./services/travis";
import gitlab from "./services/gitlab";
import git from "./services/git";
import type { CiEnvironment, Options } from "./types";
import { debug } from "../debug";

export { CiEnvironment };

// List of services ordered by usage
// "git" must be the last one
const services = [
  heroku,
  githubActions,
  circleci,
  travis,
  buildkite,
  gitlab,
  bitrise,
  git,
];

export async function getCiEnvironment({
  env = process.env,
}: Options = {}): Promise<CiEnvironment | null> {
  const ctx = { env };
  debug("Detecting CI environment", { env });
  const service = services.find((service) => service.detect(ctx));

  // Service matched
  if (service) {
    debug("Internal service matched", service.name);
    const variables = await service.config(ctx);
    const ciEnvironment = {
      name: service.name,
      key: service.key,
      ...variables,
    };
    debug("CI environment", ciEnvironment);
    return ciEnvironment;
  }

  return null;
}
