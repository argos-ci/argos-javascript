import type { Command } from "commander";
import { unwrapEmpty } from "../../../lib/api";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

export function registerMemberRemove(member: Command) {
  member
    .command("remove")
    .description(
      "Remove a member from a team. The last member cannot be removed; removing the second-to-last one promotes the survivor to owner",
    )
    .argument("<userId>", "User ID, taken from `argos account member list`")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((userId: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) => {
          unwrapEmpty(
            await client.DELETE("/accounts/{accountSlug}/members/{userId}", {
              params: { path: { accountSlug, userId } },
            }),
          );
          return { removed: true, userId };
        },
        format: ({ userId }) => `Removed user ${userId} from the team.`,
      }),
    );
}
