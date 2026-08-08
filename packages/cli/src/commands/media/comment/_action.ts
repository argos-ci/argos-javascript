import type { ArgosAPIClient, ArgosAPISchema } from "@argos-ci/api-client";
import type { Command } from "commander";
import { createApiClient } from "../../../lib/api";
import { formatComment } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type Comment = ArgosAPISchema.components["schemas"]["Comment"];

export type MediaCommentActionContext = {
  client: ArgosAPIClient;
  mediaId: string;
  commentId: string;
};

export type MediaCommentOptions = JsonOption & { token?: string | undefined };

/**
 * Register a `media comment <name> <mediaId> <commentId>` command that runs
 * `perform` and prints the returned comment.
 *
 * The media equivalent of the build `defineCommentAction`, and simpler than it:
 * a media comment is addressed by the media's own id, so there is no project
 * path to resolve and no build reference to parse.
 */
export function defineMediaCommentAction(opts: {
  name: string;
  description: string;
  perform: (ctx: MediaCommentActionContext) => Promise<Comment>;
}) {
  return (comment: Command) => {
    comment
      .command(opts.name)
      .description(opts.description)
      .argument("<mediaId>", "ID of the media")
      .argument("<commentId>", "ID of the comment")
      .addOption(tokenOption)
      .addOption(jsonOption)
      .action(
        async (
          mediaId: string,
          commentId: string,
          options: MediaCommentOptions,
        ) => {
          try {
            const client = createApiClient(await resolveToken(options));
            const result = await opts.perform({ client, mediaId, commentId });
            output(result, options, formatComment);
          } catch (error) {
            handleCliError(error, "user");
          }
        },
      );
  };
}
