import type { Command } from "commander";
import { Option } from "commander";
import ora from "ora";
import { uploadMedia, type Media } from "@argos-ci/core";
import { fail } from "../../lib/cli-error";
import { formatMediaList } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import {
  jsonOption,
  mediaProjectPathOption,
  tokenOption,
  type JsonOption,
} from "../../options";

type UploadMediaOptions = JsonOption & {
  token?: string | undefined;
  project?: string | undefined;
  slug?: string | undefined;
  visibility?: "team" | "public" | undefined;
  retention?: string | undefined;
  pr?: string | undefined;
  comment?: boolean | undefined;
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
        "--slug <slug>",
        "Stable identifier, unique per project. Re-uploading the same slug replaces the file in place, so a Markdown embed already posted to a pull request never goes stale",
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
        "--retention <days>",
        "How long to keep the media, in days. Clamped to your plan's maximum",
      ),
    )
    .addOption(
      new Option("--pr <number>", "Pull request to attach the media to"),
    )
    .addOption(
      new Option(
        "--comment",
        "Maintain a single Argos comment on the pull request listing every media uploaded to it, edited in place. Requires --pr",
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
          token: options.token,
          project: options.project,
          slug: options.slug,
          visibility: options.visibility,
          retentionDays: parseRetention(options.retention),
          prNumber: parsePrNumber(options.pr),
          comment: options.comment,
        });

        spinner?.stop();
        output(results, options, formatMediaList);
      } catch (error) {
        spinner?.stop();
        handleCliError(error, "project");
      }
    });
}

function parseRetention(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1) {
    fail(`--retention must be a positive integer, received "${value}".`);
  }
  return days;
}

function parsePrNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const prNumber = Number(value);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    fail(`--pr must be a positive integer, received "${value}".`);
  }
  return prNumber;
}

export type { Media };
