import type { Command } from "commander";
import { Option } from "commander";
import { unwrap } from "../../lib/api";
import { formatMediaList } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import { handleCliError, output } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  jsonOption,
  limitOption,
  mediaProjectPathOption,
  toLimit,
  toPrNumber,
  tokenOption,
  type JsonOption,
  type LimitOption,
} from "../../options";

type ListMediaOptions = JsonOption &
  LimitOption & {
    token?: string | undefined;
    project?: string | undefined;
    branch?: string | undefined;
    pr?: string | undefined;
    stage?: "staged" | "published" | undefined;
    search?: string | undefined;
    type?: "image" | "video" | undefined;
  };

export function registerMediaList(media: Command) {
  media
    .command("list")
    .description(
      "List a project's uploaded media, most recent first. A project token lists its own project",
    )
    .addOption(
      new Option(
        "--branch <branch>",
        "Only media uploaded for this branch, staged and published alike. The way to find everything uploaded for the work in hand",
      ),
    )
    .addOption(
      new Option("--pr <number>", "Only media published to this pull request"),
    )
    .addOption(
      new Option(
        "--stage <stage>",
        "Restrict to media with no pull request yet, or to media published to one",
      ).choices(["staged", "published"]),
    )
    .addOption(new Option("--search <query>", "Match media on their name"))
    .addOption(
      new Option("--type <type>", "Restrict to images or videos").choices([
        "image",
        "video",
      ]),
    )
    .addOption(limitOption)
    .addOption(tokenOption)
    .addOption(mediaProjectPathOption)
    .addOption(jsonOption)
    .action(async (options: ListMediaOptions) => {
      try {
        const prNumber =
          options.pr === undefined ? undefined : toPrNumber(options.pr);
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "project",
        });
        const results = await fetchPages(
          toLimit(options.limit),
          async (pagination) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/media", {
                params: {
                  path: { owner, project },
                  query: {
                    ...pagination,
                    ...(options.branch ? { branch: options.branch } : {}),
                    ...(prNumber === undefined ? {} : { prNumber }),
                    ...(options.stage ? { stage: options.stage } : {}),
                    ...(options.search ? { search: options.search } : {}),
                    ...(options.type ? { type: options.type } : {}),
                  },
                },
              }),
            ),
        );
        output(results, options, formatMediaList);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
