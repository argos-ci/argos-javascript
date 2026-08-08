import type { Command } from "commander";
import { unwrap } from "../../../lib/api";
import { formatInviteLink } from "../../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

export function registerInviteResetLink(invite: Command) {
  invite
    .command("reset-link")
    .description(
      "Rotate the team's shared invite link, invalidating the previous one",
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.POST("/accounts/{accountSlug}/invite-link/reset", {
              params: { path: { accountSlug } },
            }),
          ),
        format: formatInviteLink,
      }),
    );
}
