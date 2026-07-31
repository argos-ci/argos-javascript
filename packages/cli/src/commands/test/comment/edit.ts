import type { Command } from "commander";
import { unwrap } from "../../../lib/api";
import { resolveBody } from "../../../lib/body";
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

type TestCommentEditOptions = BaseCommandOptions & {
  body?: string;
  bodyFile?: string;
};

export function registerTestCommentEdit(comment: Command) {
  comment
    .command("edit")
    .description("Update the body of a comment on a test (author only)")
    .argument("<testId>", "Test ID, taken from a diff's `test.id`")
    .argument("<commentId>", "ID of the comment")
    .option("--body <markdown>", "New Markdown body of the comment")
    .option("--body-file <path>", "Read the new body from a Markdown file")
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(jsonOption)
    .action(
      async (
        testId: string,
        commentId: string,
        options: TestCommentEditOptions,
      ) => {
        try {
          const { client, owner, project } = await resolveProjectTarget(
            options,
            { auth: "user" },
          );
          const body = await resolveBody(options, { required: true });
          const result = unwrap(
            await client.PATCH(
              "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
              {
                params: { path: { owner, project, testId, commentId } },
                body: { body: body as string },
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
