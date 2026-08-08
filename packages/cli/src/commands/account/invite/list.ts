import type { Command } from "commander";
import { unwrap } from "../../../lib/api";
import { formatInvites } from "../../../lib/format";
import { fetchPages } from "../../../lib/pagination";
import {
  accountSlugOption,
  jsonOption,
  limitOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

type ListOptions = AccountCommandOptions &
  LimitOption & { search?: string | undefined };

export function registerInviteList(invite: Command) {
  invite
    .command("list")
    .description("List a team's pending invites, most recent first")
    .option("--search <query>", "Match invites on their email address")
    .addOption(limitOption)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ListOptions) =>
      runAccountAction({
        options,
        handler: ({ client, accountSlug }) =>
          fetchPages(toLimit(options.limit), async (pagination) =>
            unwrap(
              await client.GET("/accounts/{accountSlug}/invites", {
                params: {
                  path: { accountSlug },
                  query: {
                    ...pagination,
                    ...(options.search ? { search: options.search } : {}),
                  },
                },
              }),
            ),
          ),
        format: formatInvites,
      }),
    );
}
