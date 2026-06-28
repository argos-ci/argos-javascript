import type { Command } from "commander";
import type { ArgosAPISchema, ArgosAPIClient } from "@argos-ci/api-client";
import { formatComment } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

type Comment = ArgosAPISchema.components["schemas"]["Comment"];

export type CommentActionContext = {
  client: ArgosAPIClient;
  owner: string;
  project: string;
  buildNumber: string;
  commentId: string;
};

/**
 * Register a `comment <name> <buildReference> <commentId>` command that runs
 * `perform` and prints the returned comment. Used for the single-comment
 * actions that share the same shape (get, delete, resolve, subscribe, …).
 */
export function defineCommentAction(opts: {
  name: string;
  description: string;
  perform: (ctx: CommentActionContext) => Promise<Comment>;
}) {
  return (comment: Command) => {
    comment
      .command(opts.name)
      .description(opts.description)
      .argument("<buildReference>", "Build number or Argos build URL")
      .argument("<commentId>", "ID of the comment")
      .addOption(tokenOption)
      .addOption(projectPathOption)
      .addOption(jsonOption)
      .action(
        (reference: string, commentId: string, options: BaseCommandOptions) =>
          runBuildAction({
            reference,
            options,
            auth: "user",
            handler: ({ client, owner, project, buildNumber }) =>
              opts.perform({ client, owner, project, buildNumber, commentId }),
            format: formatComment,
          }),
      );
  };
}
