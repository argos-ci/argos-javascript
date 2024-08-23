import bitrise from "./services/bitrise";
import buildkite from "./services/buildkite";
import heroku from "./services/heroku";
import githubActions from "./services/github-actions";
import circleci from "./services/circleci";
import travis from "./services/travis";
import gitlab from "./services/gitlab";
import git from "./services/git";
import type { CiEnvironment, Context } from "./types";
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

/**
 * Create the context for the CI service detection.
 */
function createContext(): Context {
  return { env: process.env };
}

/**
 * Get the CI service that is currently running.
 */
function getCiService(context: Context) {
  return services.find((service) => service.detect(context));
}

/**
 * Get the merge base commit.
 */
export function getMergeBaseCommitSha(input: {
  base: string;
  head: string;
}): string | null {
  const context = createContext();
  const service = getCiService(context);
  if (!service) {
    return null;
  }
  return service.getMergeBaseCommitSha(input, context);
}

/**
 * Get the CI environment.
 */
export async function getCiEnvironment(): Promise<CiEnvironment | null> {
  const context = createContext();

  debug("Detecting CI environment", context);
  const service = getCiService(context);

  // Service matched
  if (service) {
    debug("Internal service matched", service.name);
    const variables = await service.config(context);
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
