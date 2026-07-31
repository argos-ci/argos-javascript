import type { Command } from "commander";
import { unwrap } from "../../../lib/api";
import { formatComment } from "../../../lib/format";
import {
  handleCliError,
  output,
  type BaseCommandOptions,
} from "../../../lib/run";
import { resolveProjectTarget } from "../../../lib/target";
import {
  jsonOption,
  testProjectPathOption,
  tokenOption,
} from "../../../options";

export function registerTestCommentReact(comment: Command) {
  comment
    .command("react")
    .description("Add an emoji reaction to a comment on a test")
    .argument("<testId>", "Test ID, taken from a diff's `test.id`")
    .argument("<commentId>", "ID of the comment")
    .argument("<emoji>", "Emoji to react with")
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(jsonOption)
    .action(
      async (
        testId: string,
        commentId: string,
        emoji: string,
        options: BaseCommandOptions,
      ) => {
        try {
          const { client, owner, project } = await resolveProjectTarget(
            options,
            { auth: "user" },
          );
          const result = unwrap(
            await client.POST(
              "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/reactions",
              {
                params: { path: { owner, project, testId, commentId } },
                body: { emoji },
              },
            ),
          );
          output(result, options, formatComment);
        } catch (error) {
          handleCliError(error, "user");
        }
      },
    );
}
