import type { Command } from "commander";
import { createApiClient, unwrap } from "../lib/api";
import { formatMe } from "../lib/format";
import { handleCliError, output } from "../lib/run";
import { resolveToken } from "../lib/target";
import { jsonOption, tokenOption } from "../options";

type WhoamiOptions = {
  token?: string | undefined;
  json?: boolean | undefined;
};

export function whoamiCommand(program: Command) {
  program
    .command("whoami")
    .description("Display the user authenticated with the current Argos token")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (options: WhoamiOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        const user = unwrap(await client.GET("/me"));
        output(user, options, formatMe);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
