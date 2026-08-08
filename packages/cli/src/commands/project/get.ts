import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatProject } from "../../lib/format";
import {
  jsonOption,
  managedProjectPathOption,
  tokenOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

export function registerProjectGet(project: Command) {
  project
    .command("get")
    .description("Fetch a project and its settings")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "project",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.GET("/projects/{owner}/{project}", {
              params: { path: { owner, project: name } },
            }),
          ),
        format: formatProject,
      }),
    );
}
