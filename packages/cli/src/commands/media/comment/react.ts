import type { Command } from "commander";
import { createApiClient, unwrap } from "../../../lib/api";
import { formatComment } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type ReactOptions = JsonOption & { token?: string | undefined };

export function registerMediaCommentReact(comment: Command) {
  comment
    .command("react")
    .description("Add an emoji reaction to a comment on a media")
    .argument("<mediaId>", "ID of the media")
    .argument("<commentId>", "ID of the comment")
    .argument("<emoji>", "Emoji to react with")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      async (
        mediaId: string,
        commentId: string,
        emoji: string,
        options: ReactOptions,
      ) => {
        try {
          const client = createApiClient(await resolveToken(options));
          const result = unwrap(
            await client.POST(
              "/media/{mediaId}/comments/{commentId}/reactions",
              {
                params: { path: { mediaId, commentId } },
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
