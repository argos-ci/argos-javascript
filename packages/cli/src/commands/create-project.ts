import type { Command } from "commander";
import { createApiClient, unwrap } from "../lib/api";
import { fail } from "../lib/cli-error";
import { formatProject } from "../lib/format";
import { handleCliError, output } from "../lib/run";
import { resolveToken } from "../lib/target";
import { accountOption, jsonOption, tokenOption } from "../options";

type CreateProjectOptions = {
  account?: string | undefined;
  token?: string | undefined;
  json?: boolean | undefined;
};

export function createProjectCommand(program: Command) {
  program
    .command("create-project")
    .argument("<name>", "Name of the project to create")
    .description("Create a new project in an account you administer")
    .addOption(accountOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (name: string, options: CreateProjectOptions) => {
      try {
        const accountSlug = options.account || process.env["ARGOS_ACCOUNT"];
        if (!accountSlug) {
          fail(
            "An account is required. Use --account <slug> or set ARGOS_ACCOUNT.",
          );
        }
        const client = createApiClient(await resolveToken(options));
        const project = unwrap(
          await client.POST("/projects", {
            body: { name, accountSlug },
          }),
        );
        output(project, options, formatProject);
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
