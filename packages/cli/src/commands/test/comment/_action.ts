import type { Command } from "commander";
import type { ArgosAPIClient, ArgosAPISchema } from "@argos-ci/api-client";
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

type Comment = ArgosAPISchema.components["schemas"]["Comment"];

export type TestCommentActionContext = {
  client: ArgosAPIClient;
  owner: string;
  project: string;
  testId: string;
  commentId: string;
};

/**
 * Register a `test comment <name> <testId> <commentId>` command that runs
 * `perform` and prints the returned comment. Used for the single-comment actions
 * that share the same shape (get, delete, resolve, subscribe, …), mirroring
 * `defineCommentAction` on the build side.
 */
export function defineTestCommentAction(opts: {
  name: string;
  description: string;
  perform: (ctx: TestCommentActionContext) => Promise<Comment>;
}) {
  return (comment: Command) => {
    comment
      .command(opts.name)
      .description(opts.description)
      .argument("<testId>", "Test ID, taken from a diff's `test.id`")
      .argument("<commentId>", "ID of the comment")
      .addOption(tokenOption)
      .addOption(testProjectPathOption)
      .addOption(jsonOption)
      .action(
        async (
          testId: string,
          commentId: string,
          options: BaseCommandOptions,
        ) => {
          try {
            const { client, owner, project } = await resolveProjectTarget(
              options,
              { auth: "user" },
            );
            const result = await opts.perform({
              client,
              owner,
              project,
              testId,
              commentId,
            });
            output(result, options, formatComment);
          } catch (error) {
            handleCliError(error, "user");
          }
        },
      );
  };
}
