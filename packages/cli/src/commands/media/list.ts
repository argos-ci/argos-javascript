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
  tokenOption,
  type JsonOption,
  type LimitOption,
} from "../../options";

type ListMediaOptions = JsonOption &
  LimitOption & {
    token?: string | undefined;
    project?: string | undefined;
    search?: string | undefined;
    type?: "image" | "video" | undefined;
  };

export function registerMediaList(media: Command) {
  media
    .command("list")
    .description(
      "List a project's uploaded media, most recent first. A project token lists its own project",
    )
    .addOption(limitOption)
    .addOption(new Option("--search <query>", "Match media on name or slug"))
    .addOption(
      new Option("--type <type>", "Restrict to images or videos").choices([
        "image",
        "video",
      ]),
    )
    .addOption(tokenOption)
    .addOption(mediaProjectPathOption)
    .addOption(jsonOption)
    .action(async (options: ListMediaOptions) => {
      try {
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
