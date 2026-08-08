import type { Command } from "commander";
import { createApiClient, unwrap } from "../../../lib/api";
import { formatComments } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type ListOptions = JsonOption & { token?: string | undefined };

export function registerMediaCommentList(comment: Command) {
  comment
    .command("list")
    .description("List the comments on a media")
    .argument("<mediaId>", "ID of the media")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: ListOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.GET("/media/{mediaId}/comments", {
            params: { path: { mediaId } },
          }),
        );
        output(result, options, formatComments);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
