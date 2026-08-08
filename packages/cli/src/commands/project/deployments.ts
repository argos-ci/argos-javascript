import { Option, type Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatDeployments } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import {
  jsonOption,
  limitOption,
  managedProjectPathOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

const ENVIRONMENTS = ["preview", "production"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

export function registerProjectDeployments(project: Command) {
  project
    .command("deployments")
    .description("List a project's deployments, most recent first")
    .addOption(
      new Option(
        "--environment <environment>",
        "Restrict to one environment. Use production to see what is live right now",
      ).choices(ENVIRONMENTS),
    )
    .addOption(limitOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        options: ProjectCommandOptions &
          LimitOption & { environment?: Environment },
      ) =>
        runProjectAction({
          options,
          auth: "project",
          handler: ({ client, owner, project: name }) =>
            fetchPages(toLimit(options.limit), async (pagination) =>
              unwrap(
                await client.GET("/projects/{owner}/{project}/deployments", {
                  params: {
                    path: { owner, project: name },
                    query: {
                      ...pagination,
                      ...(options.environment
                        ? { environment: options.environment }
                        : {}),
                    },
                  },
                }),
              ),
            ),
          format: formatDeployments,
        }),
    );
}
