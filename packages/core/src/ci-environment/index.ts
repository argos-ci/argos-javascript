import buildkite from "./services/buildkite";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";
import circleci from "./services/circleci";
import travis from "./services/travis";
import type { CiEnvironment, Options } from "./types";
import { debug } from "../debug";
import { getCiEnvironmentFromEnvCi } from "./env-ci";

export { CiEnvironment };

const services = [heroku, githubActions, circleci, travis, buildkite];

export const getCiEnvironment = ({
  env = process.env,
}: Options = {}): CiEnvironment | null => {
  const ctx = { env };
  debug("Detecting CI environment", { env });
  const service = services.find((service) => service.detect(ctx));

  // Service matched
  if (service) {
    debug("Internal service matched", service.name);
    const variables = service.config(ctx);
    const ciEnvironment = { name: service.name, ...variables };
    debug("CI environment", ciEnvironment);
    return ciEnvironment;
  }

  // We fallback on "env-ci" library, not very good but it's better than nothing
  debug("Falling back on env-ci");
  const ciEnvironment = getCiEnvironmentFromEnvCi(ctx);
  debug("CI environment", ciEnvironment);
  return ciEnvironment;
};
