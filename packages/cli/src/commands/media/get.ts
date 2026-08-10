import type { Command } from "commander";
import { createApiClient, unwrap } from "../../lib/api";
import { formatMedia } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveToken } from "../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../options";

type GetMediaOptions = JsonOption & { token?: string | undefined };

export function registerMediaGet(media: Command) {
  media
    .command("get")
    .argument("<mediaId>", "ID of the media")
    .description("Show a media's share URL, Markdown embed and details")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: GetMediaOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.GET("/media/{mediaId}", {
            params: { path: { mediaId } },
          }),
        );
        output(result, options, formatMedia);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
