import { Option, type Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../../lib/api";
import { formatInvites } from "../../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

type TeamUserLevel = ArgosAPISchema.components["schemas"]["TeamUserLevel"];

const TEAM_USER_LEVELS = [
  "owner",
  "member",
  "contributor",
] as const satisfies TeamUserLevel[];

export function registerInviteCreate(invite: Command) {
  invite
    .command("create")
    .description(
      "Invite people to a team by email. Re-inviting a pending address refreshes its invite",
    )
    .argument("<emails...>", "Email addresses to invite")
    .addOption(
      new Option("--level <level>", "Role to give the invited people")
        .choices(TEAM_USER_LEVELS)
        .default("member" satisfies TeamUserLevel),
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        emails: string[],
        options: AccountCommandOptions & { level: TeamUserLevel },
      ) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.POST("/accounts/{accountSlug}/invites", {
                params: { path: { accountSlug } },
                body: {
                  members: emails.map((email) => ({
                    email,
                    level: options.level,
                  })),
                },
              }),
            ),
          format: formatInvites,
        }),
    );
}
