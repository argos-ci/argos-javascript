import type { Command } from "commander";
import { createApiClient, unwrap } from "../../../lib/api";
import { formatComment } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type UnreactOptions = JsonOption & { token?: string | undefined };

export function registerMediaCommentUnreact(comment: Command) {
  comment
    .command("unreact")
    .description("Remove one of your emoji reactions from a comment on a media")
    .argument("<mediaId>", "ID of the media")
    .argument("<commentId>", "ID of the comment")
    .argument("<emoji>", "Emoji reaction to remove")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      async (
        mediaId: string,
        commentId: string,
        emoji: string,
        options: UnreactOptions,
      ) => {
        try {
          const client = createApiClient(await resolveToken(options));
          const result = unwrap(
            await client.DELETE(
              "/media/{mediaId}/comments/{commentId}/reactions",
              {
                params: { path: { mediaId, commentId }, query: { emoji } },
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
