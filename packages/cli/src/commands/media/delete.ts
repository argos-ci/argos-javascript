import type { Command } from "commander";
import { createApiClient, unwrapEmpty } from "../../lib/api";
import { handleCliError } from "../../lib/run";
import { resolveToken } from "../../lib/target";
import { tokenOption } from "../../options";

type DeleteMediaOptions = { token?: string | undefined };

export function registerMediaDelete(media: Command) {
  media
    .command("delete")
    .argument("<mediaId>", "ID of the media")
    .description(
      "Delete a media. Any share link or pull request embed pointing at it stops working",
    )
    .addOption(tokenOption)
    .action(async (mediaId: string, options: DeleteMediaOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        unwrapEmpty(
          await client.DELETE("/media/{mediaId}", {
            params: { path: { mediaId } },
          }),
        );
        console.log(`Media ${mediaId} deleted.`);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
