import { Option, type Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap, unwrapEmpty } from "../../lib/api";
import { formatContributor, formatContributors } from "../../lib/format";
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

type ProjectUserLevel =
  ArgosAPISchema.components["schemas"]["ProjectUserLevel"];

const PROJECT_USER_LEVELS = [
  "admin",
  "reviewer",
  "viewer",
] as const satisfies ProjectUserLevel[];

export function registerProjectContributor(project: Command) {
  const contributor = project
    .command("contributor")
    .description(
      "Manage the users explicitly granted access to a project. Team owners and members already reach every project",
    );

  contributor
    .command("list")
    .description("List a project's contributors and their access level")
    .addOption(limitOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions & LimitOption) =>
      runProjectAction({
        options,
        auth: "user",
        handler: ({ client, owner, project: name }) =>
          fetchPages(toLimit(options.limit), async (pagination) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/contributors", {
                params: {
                  path: { owner, project: name },
                  query: pagination,
                },
              }),
            ),
          ),
        format: formatContributors,
      }),
    );

  contributor
    .command("set")
    .description(
      "Grant a user access to a project, or change the level they already hold",
    )
    .argument(
      "<userId>",
      "User ID, taken from `argos account member list` or `argos project contributor list`",
    )
    .addOption(
      new Option("--level <level>", "Access level to grant")
        .choices(PROJECT_USER_LEVELS)
        .makeOptionMandatory(),
    )
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        userId: string,
        options: ProjectCommandOptions & { level: ProjectUserLevel },
      ) =>
        runProjectAction({
          options,
          auth: "user",
          handler: async ({ client, owner, project: name }) =>
            unwrap(
              await client.PUT(
                "/projects/{owner}/{project}/contributors/{userId}",
                {
                  params: { path: { owner, project: name, userId } },
                  body: { level: options.level },
                },
              ),
            ),
          format: formatContributor,
        }),
    );

  contributor
    .command("remove")
    .description(
      "Revoke a user's access to a project. Removing yourself never needs administrator access",
    )
    .argument("<userId>", "User ID of the contributor to remove")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((userId: string, options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) => {
          unwrapEmpty(
            await client.DELETE(
              "/projects/{owner}/{project}/contributors/{userId}",
              { params: { path: { owner, project: name, userId } } },
            ),
          );
          return { removed: true, userId };
        },
        format: ({ userId: removed }) => `Revoked access for user ${removed}.`,
      }),
    );
}
