import type { Command } from "commander";
import { Option } from "commander";
import { unwrap } from "../../lib/api";
import { formatMediaList } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import { handleCliError, output } from "../../lib/run";
import { resolveAccountTarget } from "../../lib/target";
import {
  accountSlugOption,
  jsonOption,
  limitOption,
  toLimit,
  tokenOption,
  type JsonOption,
  type LimitOption,
} from "../../options";

type ListMediaOptions = JsonOption &
  LimitOption & {
    token?: string | undefined;
    account?: string | undefined;
    search?: string | undefined;
    type?: "image" | "video" | undefined;
  };

export function registerMediaList(media: Command) {
  media
    .command("list")
    .description(
      "List a team's uploaded media, most recent first. Requires administrator access to the team",
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
    .addOption(accountSlugOption)
    .addOption(jsonOption)
    .action(async (options: ListMediaOptions) => {
      try {
        const { client, accountSlug } = await resolveAccountTarget(options);
        const results = await fetchPages(
          toLimit(options.limit),
          async (pagination) =>
            unwrap(
              await client.GET("/accounts/{accountSlug}/media", {
                params: {
                  path: { accountSlug },
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
        handleCliError(error, "user");
      }
    });
}
