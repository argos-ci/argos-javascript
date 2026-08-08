import { Option, type Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { formatAccount } from "../../lib/format";
import { accountSlugOption, jsonOption, tokenOption } from "../../options";
import { runAccountAction, type AccountCommandOptions } from "./_run";

type TeamDefaultUserLevel =
  ArgosAPISchema.components["schemas"]["TeamDefaultUserLevel"];

const DEFAULT_USER_LEVELS = [
  "member",
  "contributor",
] as const satisfies TeamDefaultUserLevel[];

export function registerAccountUpdate(account: Command) {
  account
    .command("update")
    .description(
      "Change the role given to users joining a team through its invite link or a verified email domain",
    )
    .addOption(
      new Option(
        "--default-user-level <level>",
        "Role given to users that join the team automatically",
      )
        .choices(DEFAULT_USER_LEVELS)
        .makeOptionMandatory(),
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        options: AccountCommandOptions & {
          defaultUserLevel: TeamDefaultUserLevel;
        },
      ) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.PATCH("/accounts/{accountSlug}", {
                params: { path: { accountSlug } },
                body: { defaultUserLevel: options.defaultUserLevel },
              }),
            ),
          format: formatAccount,
        }),
    );
}
