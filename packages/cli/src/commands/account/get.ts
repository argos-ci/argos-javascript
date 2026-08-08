import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatAccount } from "../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../options";
import { runAccountAction, type AccountCommandOptions } from "./_run";

export function registerAccountGet(account: Command) {
  account
    .command("get")
    .description("Fetch an account with its plan and current-period usage")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.GET("/accounts/{accountSlug}", {
              params: { path: { accountSlug } },
            }),
          ),
        format: formatAccount,
      }),
    );
}
