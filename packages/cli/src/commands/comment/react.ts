import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatComment } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerCommentReact(comment: Command) {
  comment
    .command("react")
    .description("Add an emoji reaction to a comment")
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument("<commentId>", "ID of the comment")
    .argument("<emoji>", "Emoji to react with")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (
        reference: string,
        commentId: string,
        emoji: string,
        options: BaseCommandOptions,
      ) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) =>
            unwrap(
              await client.POST(
                "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
                {
                  params: { path: { owner, project, buildNumber, commentId } },
                  body: { emoji },
                },
              ),
            ),
          format: formatComment,
        }),
    );
}
