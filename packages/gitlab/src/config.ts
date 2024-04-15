/**
 * Get the configuration from the environment variables.
 */
export function getConfig() {
  if (!process.env.CI_PROJECT_ID) {
    throw new Error("CI_PROJECT_ID is not set");
  }
  if (!process.env.CI_SERVER_URL) {
    throw new Error("CI_SERVER_URL is not set");
  }
  if (!process.env.CI_COMMIT_SHA) {
    throw new Error("CI_COMMIT_SHA is not set");
  }
  if (!process.env.ARGOS_GITLAB_TOKEN) {
    throw new Error("ARGOS_GITLAB_TOKEN is not set");
  }
  if (!process.env.ARGOS_TOKEN) {
    throw new Error("ARGOS_TOKEN is not set");
  }
  return {
    commit: process.env.CI_COMMIT_SHA,
    argosToken: process.env.ARGOS_TOKEN,
    gitlab: {
      projectId: process.env.CI_PROJECT_ID,
      authToken: process.env.ARGOS_GITLAB_TOKEN,
      baseUrl: process.env.CI_SERVER_URL,
    },
  };
}
