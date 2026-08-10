import type { Command } from "commander";
import { parseAnchor } from "../../../lib/anchor";
import { createApiClient, unwrap } from "../../../lib/api";
import { resolveBody } from "../../../lib/body";
import { fail } from "../../../lib/cli-error";
import { formatComment } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type MediaCommentCreateOptions = JsonOption & {
  token?: string | undefined;
  body?: string;
  bodyFile?: string;
  replyTo?: string;
  anchorPoint?: string;
};

export function registerMediaCommentCreate(comment: Command) {
  comment
    .command("create")
    .description("Post a comment (or reply) on a media")
    .argument("<mediaId>", "ID of the media")
    .option("--body <markdown>", "Markdown body of the comment")
    .option("--body-file <path>", "Read the comment body from a Markdown file")
    .option(
      "--reply-to <threadId>",
      "Reply to an existing thread (its root comment ID)",
    )
    .option(
      "--anchor-point <x,y>",
      "Pin the comment to a spot on the media, in normalized 0-1 coordinates",
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: MediaCommentCreateOptions) => {
      try {
        const body = await resolveBody(options, { required: true });
        const anchor = parseAnchor(options);
        // A reply inherits the spot its thread already points at, and a line
        // range describes a text snapshot rather than an image.
        if (anchor && options.replyTo) {
          fail("--anchor-point cannot be used with --reply-to.");
        }
        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.POST("/media/{mediaId}/comments", {
            params: { path: { mediaId } },
            body: {
              body: body as string,
              threadId: options.replyTo,
              anchor,
            },
          }),
        );
        output(result, options, formatComment);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
