import type { Command } from "commander";
import { createApiClient, unwrap } from "../../lib/api";
import { formatMediaVersions } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveToken } from "../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../options";

type VersionsOptions = JsonOption & { token?: string | undefined };

export function registerMediaVersions(media: Command) {
  media
    .command("versions")
    .argument("<mediaId>", "ID of the media")
    .description(
      "List a media's uploaded versions, newest first. Use it to resolve the version a comment was written against",
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: VersionsOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.GET("/media/{mediaId}/versions", {
            params: { path: { mediaId } },
          }),
        );
        output(result, options, formatMediaVersions);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
