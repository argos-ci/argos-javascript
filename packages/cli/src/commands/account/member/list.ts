import { Option, type Command } from "commander";
import { unwrap } from "../../../lib/api";
import { formatMembers } from "../../../lib/format";
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

const ORDER_BY_CHOICES = ["date", "name-asc", "name-desc"] as const;

type ListOptions = AccountCommandOptions &
  LimitOption & {
    search?: string | undefined;
    levels?: string | undefined;
    orderBy?: (typeof ORDER_BY_CHOICES)[number] | undefined;
  };

export function registerMemberList(member: Command) {
  member
    .command("list")
    .description("List a team's members and their roles")
    .option("--search <query>", "Match members on their name, slug, or email")
    .option(
      "--levels <levels>",
      "Restrict to the given roles, comma-separated (e.g. owner,member)",
    )
    .addOption(
      new Option("--order-by <order>", "Ordering of the results").choices(
        ORDER_BY_CHOICES,
      ),
    )
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
              await client.GET("/accounts/{accountSlug}/members", {
                params: {
                  path: { accountSlug },
                  query: {
                    ...pagination,
                    ...(options.search ? { search: options.search } : {}),
                    ...(options.levels ? { levels: options.levels } : {}),
                    ...(options.orderBy ? { orderBy: options.orderBy } : {}),
                  },
                },
              }),
            ),
          ),
        format: formatMembers,
      }),
    );
}
