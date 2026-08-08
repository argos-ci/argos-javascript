import type { Command } from "commander";
import { unwrapEmpty } from "../../../lib/api";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

export function registerInviteCancel(invite: Command) {
  invite
    .command("cancel")
    .description("Cancel a pending invite, invalidating its link")
    .argument("<inviteId>", "Invite ID, taken from `argos account invite list`")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((inviteId: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) => {
          unwrapEmpty(
            await client.DELETE("/accounts/{accountSlug}/invites/{inviteId}", {
              params: { path: { accountSlug, inviteId } },
            }),
          );
          return { cancelled: true, inviteId };
        },
        format: ({ inviteId }) => `Cancelled invite ${inviteId}.`,
      }),
    );
}
