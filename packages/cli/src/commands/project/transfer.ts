import { Option, type Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatProject } from "../../lib/format";
import {
  jsonOption,
  managedProjectPathOption,
  tokenOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

export function registerProjectTransfer(project: Command) {
  project
    .command("transfer")
    .description(
      "Move a project to another account. You must administer the project and the account receiving it",
    )
    .addOption(
      new Option(
        "--to <slug>",
        "Slug of the account that will own the project",
      ).makeOptionMandatory(),
    )
    .option(
      "--name <name>",
      "Name to give the project on the target account. Defaults to its current name, which must be free there",
    )
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions & { to: string; name?: string }) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.POST("/projects/{owner}/{project}/transfer", {
              params: { path: { owner, project: name } },
              body: {
                targetAccountSlug: options.to,
                ...(options.name ? { name: options.name } : {}),
              },
            }),
          ),
        format: formatProject,
      }),
    );
}
