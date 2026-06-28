import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatComment } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerCommentUnreact(comment: Command) {
  comment
    .command("unreact")
    .description("Remove one of your emoji reactions from a comment")
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument("<commentId>", "ID of the comment")
    .argument("<emoji>", "Emoji reaction to remove")
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
              await client.DELETE(
                "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions",
                {
                  params: {
                    path: { owner, project, buildNumber, commentId },
                    query: { emoji },
                  },
                },
              ),
            ),
          format: formatComment,
        }),
    );
}
