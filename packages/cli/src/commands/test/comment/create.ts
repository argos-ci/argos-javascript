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

type TestCommentCreateOptions = BaseCommandOptions & {
  body?: string;
  bodyFile?: string;
  replyTo?: string;
};

export function registerTestCommentCreate(comment: Command) {
  comment
    .command("create")
    .description("Post a comment (or reply) on a test")
    .argument("<testId>", "Test ID, taken from a diff's `test.id`")
    .option("--body <markdown>", "Markdown body of the comment")
    .option("--body-file <path>", "Read the comment body from a Markdown file")
    .option(
      "--reply-to <threadId>",
      "Reply to an existing thread (its root comment ID)",
    )
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(jsonOption)
    .action(async (testId: string, options: TestCommentCreateOptions) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "user",
        });
        const body = await resolveBody(options, { required: true });
        const result = unwrap(
          await client.POST(
            "/projects/{owner}/{project}/tests/{testId}/comments",
            {
              params: { path: { owner, project, testId } },
              body: { body: body as string, threadId: options.replyTo },
            },
          ),
        );
        output(result, options, formatComment);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
