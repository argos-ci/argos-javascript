import type { ArgosAPIClient } from "@argos-ci/api-client";
import { createClient } from "@argos-ci/api-client";
import { Gitlab } from "@gitbeaker/rest";

type GitlabAPIClient = InstanceType<typeof Gitlab>;

/**
 * Run the main logic of the action.
 */
async function run(input: {
  commit: string;
  pullInterval: number;
  argosClient: ArgosAPIClient;
  gitlabClient: GitlabAPIClient;
  gitlabProjectId: string;
}) {
  const { argosClient, gitlabClient, gitlabProjectId, pullInterval, commit } =
    input;
  const { data, error } = await argosClient.GET("/project/builds", {
    params: {
      query: {
        distinctName: "true",
        commit,
      },
    },
  });

  if (error) {
    console.error(error);
    throw new Error(error.error);
  }

  if (data.results.length === 0) {
    console.log("No builds found for commit", commit);
    return;
  }

  await Promise.all(
    data.results.map(async (build) => {
      if (build.notification) {
        console.log(
          `Setting status for build #${build.number}: "${build.status}" (Argos) → "${build.notification.gitlab.state}" (GitLab)`,
        );
        await gitlabClient.Commits.editStatus(
          gitlabProjectId,
          commit,
          build.notification.gitlab.state,
          {
            context: build.notification.context,
            targetUrl: build.url,
            description: build.notification.description,
          },
        );
      }
    }),
  );

  if (
    data.results.some(
      (build) => build.status === "pending" || build.status === "progress",
    )
  ) {
    await new Promise((resolve) => setTimeout(resolve, pullInterval));
    run(input);
  }
}

/**
 * Upate GitLab commit statuses based on Argos builds.
 */
export async function updateGitLabCommitStatuses(input: {
  commit: string;
  pullInterval?: number;
  argosToken: string;
  gitlab: {
    projectId: string;
    authToken: string;
    baseUrl: string;
  };
}) {
  const argos = createClient({
    authToken: input.argosToken,
  });
  const gitlab = new Gitlab({
    oauthToken: input.gitlab.authToken,
    host: input.gitlab.baseUrl,
  });
  await run({
    argosClient: argos,
    gitlabClient: gitlab,
    gitlabProjectId: input.gitlab.projectId,
    commit: input.commit,
    pullInterval: input.pullInterval ?? 3000,
  });
}
