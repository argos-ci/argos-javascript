import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatComments } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerCommentList(comment: Command) {
  comment
    .command("list")
    .description("List the comments on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action((reference: string, options: BaseCommandOptions) =>
      runBuildAction({
        reference,
        options,
        auth: "user",
        handler: async ({ client, owner, project, buildNumber }) =>
          unwrap(
            await client.GET(
              "/projects/{owner}/{project}/builds/{buildNumber}/comments",
              { params: { path: { owner, project, buildNumber } } },
            ),
          ),
        format: formatComments,
      }),
    );
}
