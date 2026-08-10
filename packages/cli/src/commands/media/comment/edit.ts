import type { Command } from "commander";
import { createApiClient, unwrap } from "../../../lib/api";
import { resolveBody } from "../../../lib/body";
import { formatComment } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type EditOptions = JsonOption & {
  token?: string | undefined;
  body?: string;
  bodyFile?: string;
};

export function registerMediaCommentEdit(comment: Command) {
  comment
    .command("edit")
    .description("Update the body of a comment on a media (author only)")
    .argument("<mediaId>", "ID of the media")
    .argument("<commentId>", "ID of the comment")
    .option("--body <markdown>", "New Markdown body of the comment")
    .option("--body-file <path>", "Read the new body from a Markdown file")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      async (mediaId: string, commentId: string, options: EditOptions) => {
        try {
          const body = await resolveBody(options, { required: true });
          const client = createApiClient(await resolveToken(options));
          const result = unwrap(
            await client.PATCH("/media/{mediaId}/comments/{commentId}", {
              params: { path: { mediaId, commentId } },
              body: { body: body as string },
            }),
          );
          output(result, options, formatComment);
        } catch (error) {
          handleCliError(error, "user");
        }
      },
    );
}
