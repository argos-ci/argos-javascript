import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { resolveBody } from "../../lib/body";
import { formatComment } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

type CommentEditOptions = BaseCommandOptions & {
  body?: string;
  bodyFile?: string;
};

export function registerCommentEdit(comment: Command) {
  comment
    .command("edit")
    .description("Update the body of a comment (author only)")
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument("<commentId>", "ID of the comment")
    .option("--body <markdown>", "New Markdown body of the comment")
    .option("--body-file <path>", "Read the new body from a Markdown file")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (reference: string, commentId: string, options: CommentEditOptions) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) => {
            const body = await resolveBody(options, { required: true });
            return unwrap(
              await client.PATCH(
                "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
                {
                  params: { path: { owner, project, buildNumber, commentId } },
                  body: { body: body as string },
                },
              ),
            );
          },
          format: formatComment,
        }),
    );
}
