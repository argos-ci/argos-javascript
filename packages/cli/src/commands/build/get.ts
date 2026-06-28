import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatBuild } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, tokenOption } from "../../options";

export function registerBuildGet(build: Command) {
  build
    .command("get")
    .description("Fetch build metadata")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((reference: string, options: BaseCommandOptions) =>
      runBuildAction({
        reference,
        options,
        auth: "project",
        handler: async ({ client, owner, project, buildNumber }) =>
          unwrap(
            await client.GET(
              "/projects/{owner}/{project}/builds/{buildNumber}",
              { params: { path: { owner, project, buildNumber } } },
            ),
          ),
        format: formatBuild,
      }),
    );
}
