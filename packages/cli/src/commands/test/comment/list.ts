import type { Command } from "commander";
import { unwrap } from "../../../lib/api";
import { formatComments } from "../../../lib/format";
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

export function registerTestCommentList(comment: Command) {
  comment
    .command("list")
    .description("List the comments on a test")
    .argument("<testId>", "Test ID, taken from a diff's `test.id`")
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(jsonOption)
    .action(async (testId: string, options: BaseCommandOptions) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "user",
        });
        const result = unwrap(
          await client.GET(
            "/projects/{owner}/{project}/tests/{testId}/comments",
            { params: { path: { owner, project, testId } } },
          ),
        );
        output(result, options, formatComments);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
