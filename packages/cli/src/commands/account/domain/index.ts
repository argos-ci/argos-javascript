import type { Command } from "commander";
import { unwrap, unwrapEmpty } from "../../../lib/api";
import { formatDomain, formatDomains } from "../../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

export function registerAccountDomain(account: Command) {
  const domain = account
    .command("domain")
    .description(
      "Manage the email domains a team is open to: anyone signing up with a verified address on one joins automatically",
    );

  domain
    .command("list")
    .description("List the email domains a team is open to")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.GET("/accounts/{accountSlug}/domains", {
              params: { path: { accountSlug } },
            }),
          ),
        format: formatDomains,
      }),
    );

  domain
    .command("add")
    .description(
      "Open a team to an email domain. You must hold a verified address on it; public email providers are refused",
    )
    .argument("<domain>", "Email domain, e.g. acme.com")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((value: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.POST("/accounts/{accountSlug}/domains", {
              params: { path: { accountSlug } },
              body: { domain: value },
            }),
          ),
        format: formatDomain,
      }),
    );

  domain
    .command("remove")
    .description(
      "Close a team to an email domain. Members who already joined through it stay",
    )
    .argument("<domain>", "Email domain to remove")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((value: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) => {
          unwrapEmpty(
            await client.DELETE("/accounts/{accountSlug}/domains/{domain}", {
              params: { path: { accountSlug, domain: value } },
            }),
          );
          return { removed: true, domain: value };
        },
        format: ({ domain: removed }) =>
          `Closed the team to ${removed}. Existing members keep their access.`,
      }),
    );
}
