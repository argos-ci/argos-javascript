import { Option, type Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../../lib/api";
import { formatMember } from "../../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

type TeamUserLevel = ArgosAPISchema.components["schemas"]["TeamUserLevel"];

const TEAM_USER_LEVELS = [
  "owner",
  "member",
  "contributor",
] as const satisfies TeamUserLevel[];

export function registerMemberSetLevel(member: Command) {
  member
    .command("set-level")
    .description("Change a team member's role")
    .argument("<userId>", "User ID, taken from `argos account member list`")
    .addOption(
      new Option("--level <level>", "Role to give the member")
        .choices(TEAM_USER_LEVELS)
        .makeOptionMandatory(),
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        userId: string,
        options: AccountCommandOptions & { level: TeamUserLevel },
      ) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.PATCH("/accounts/{accountSlug}/members/{userId}", {
                params: { path: { accountSlug, userId } },
                body: { level: options.level },
              }),
            ),
          format: formatMember,
        }),
    );
}
