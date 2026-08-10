import type { Command } from "commander";
import { Option } from "commander";
import ora from "ora";
import { uploadMedia, type Media, type MediaState } from "@argos-ci/core";
import { getApiBaseUrl } from "../../lib/api";
import { formatMediaList } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveOptionalToken } from "../../lib/target";
import {
  jsonOption,
  mediaProjectPathOption,
  toPrNumber,
  tokenOption,
  type JsonOption,
} from "../../options";

type UploadMediaOptions = JsonOption & {
  token?: string | undefined;
  project?: string | undefined;
  branch?: string | undefined;
  pr?: string | undefined;
  state?: MediaState | undefined;
  description?: string | undefined;
  visibility?: "team" | "public" | undefined;
  compress?: boolean | undefined;
};

export function registerMediaUpload(media: Command) {
  media
    .command("upload")
    .argument("<files...>", "Image or video files to upload")
    .description(
      "Upload images or videos and print their share URLs and Markdown embeds",
    )
    .addOption(tokenOption)
    .addOption(mediaProjectPathOption)
    .addOption(
      new Option(
        "--branch <branch>",
        "Branch the media belongs to. Use this when the pull request does not exist yet: Argos publishes the media and comments on the pull request by itself once one opens for that branch",
      ),
    )
    .addOption(
      new Option(
        "--pr <number>",
        "Pull request to publish the media to. Argos keeps one comment on it listing every media uploaded, edited in place",
      ),
    )
    .addOption(
      new Option(
        "--state <state>",
        "Which half of a before/after pair these files are. Inferred from a file name ending in -before or -after",
      ).choices(["before", "after"]),
    )
    .addOption(
      new Option(
        "--description <text>",
        "Prose shown under the media in the pull request comment",
      ),
    )
    .addOption(
      new Option(
        "--visibility <visibility>",
        "Who can open the share page. Defaults to the most private option your plan allows",
      ).choices(["team", "public"]),
    )
    .addOption(
      new Option(
        "--no-compress",
        "Upload images exactly as they are instead of converting them to WebP",
      ),
    )
    .addOption(jsonOption)
    .action(async (files: string[], options: UploadMediaOptions) => {
      // The spinner would interleave with JSON on stdout and break any parser
      // reading it.
      const spinner = options.json
        ? null
        : ora(
            files.length === 1
              ? "Uploading media"
              : `Uploading ${files.length} files`,
          ).start();

      try {
        const results = await uploadMedia({
          files,
          // Resolved here rather than left to the SDK so a token from
          // `argos login` works, like it does for every other media command.
          token: await resolveOptionalToken(options),
          apiBaseUrl: getApiBaseUrl(),
          project: options.project,
          branch: options.branch,
          prNumber:
            options.pr === undefined ? undefined : toPrNumber(options.pr),
          state: options.state,
          description: options.description,
          visibility: options.visibility,
          compress: options.compress,
        });

        spinner?.stop();
        output(results, options, formatMediaList);
      } catch (error) {
        spinner?.stop();
        handleCliError(error, "project");
      }
    });
}

export type { Media };
