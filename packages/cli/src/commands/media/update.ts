import type { Command } from "commander";
import { Option } from "commander";
import { createApiClient, unwrap } from "../../lib/api";
import { fail } from "../../lib/cli-error";
import { formatMedia } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveToken } from "../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../options";

type UpdateMediaOptions = JsonOption & {
  token?: string | undefined;
  name?: string | undefined;
  /** `false` when `--no-description` cleared it. */
  description?: string | false | undefined;
  /** `false` when `--no-branch` cleared it. */
  branch?: string | false | undefined;
};

export function registerMediaUpdate(media: Command) {
  media
    .command("update")
    .argument("<mediaId>", "ID of the media")
    .description(
      "Change a staged media's name, description or branch. Fixed once the media is published to a pull request",
    )
    .addOption(new Option("--name <name>", "Rename the media"))
    .addOption(
      new Option(
        "--description <text>",
        "Prose shown under the media in the pull request comment",
      ),
    )
    .addOption(new Option("--no-description", "Remove the description"))
    .addOption(
      new Option(
        "--branch <branch>",
        "Branch to publish the media from, once a pull request opens for it",
      ),
    )
    .addOption(
      new Option(
        "--no-branch",
        "Detach the media from its branch, so no pull request will publish it",
      ),
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: UpdateMediaOptions) => {
      try {
        const body = {
          // Truthiness, like the two below: an empty value is a caller clearing a
          // field, and a name has no cleared state — so it drops out and the
          // "nothing to update" guard below reports it.
          ...(options.name ? { name: options.name } : {}),
          ...(options.description === undefined
            ? {}
            : { description: options.description || null }),
          ...(options.branch === undefined
            ? {}
            : { branch: options.branch || null }),
        };

        // The API answers 200 to an empty patch, which reads as success for a
        // command that changed nothing.
        if (Object.keys(body).length === 0) {
          fail(
            "Nothing to update. Pass --name, --description or --branch (or --no-description / --no-branch to clear one).",
          );
        }

        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.PATCH("/media/{mediaId}", {
            params: { path: { mediaId } },
            body,
          }),
        );
        output(result, options, formatMedia);
      } catch (error) {
        // A project token can edit its own project's media, so the
        // personal-access-token hint would point at the wrong problem.
        handleCliError(error, "project");
      }
    });
}
