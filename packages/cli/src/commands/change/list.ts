import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatIgnoredChanges } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  changeProjectPathOption,
  jsonOption,
  limitOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../options";

export function registerChangeList(change: Command) {
  change
    .command("list")
    .description(
      "List the changes currently ignored in a project, most recently ignored first",
    )
    .addOption(limitOption)
    .addOption(tokenOption)
    .addOption(changeProjectPathOption)
    .addOption(jsonOption)
    .action(async (options: BaseCommandOptions & LimitOption) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "project",
        });
        const changes = await fetchPages(
          toLimit(options.limit),
          async (pagination) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/ignored-changes", {
                params: { path: { owner, project }, query: pagination },
              }),
            ),
        );
        output(changes, options, formatIgnoredChanges);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
