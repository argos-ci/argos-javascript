import type { Command } from "commander";
import type { ArgosAPISchema, ArgosAPIClient } from "@argos-ci/api-client";
import { formatChange } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  changeProjectPathOption,
  jsonOption,
  metricsPeriodOption,
  type MetricsPeriod,
  type MetricsPeriodOption,
  toMetricsPeriod,
  tokenOption,
} from "../../options";

type Change = ArgosAPISchema.components["schemas"]["Change"];

export type ChangeActionContext = {
  client: ArgosAPIClient;
  owner: string;
  project: string;
  changeId: string;
  metricsPeriod: MetricsPeriod;
};

/**
 * Register a `change <name> <changeId>` command that runs `perform` and prints
 * the updated change. Both change actions (ignore, unignore) share the same
 * shape and differ only by the endpoint they hit. They act as a user, so they
 * need a personal access token, and the project comes from `--project` or
 * `ARGOS_PROJECT` since a change id does not carry the account slug.
 */
export function defineChangeAction(opts: {
  name: string;
  description: string;
  perform: (ctx: ChangeActionContext) => Promise<Change>;
}) {
  return (change: Command) => {
    change
      .command(opts.name)
      .description(opts.description)
      .argument(
        "<changeId>",
        "Change ID, taken from a diff's `change.id` (see `argos build snapshots`)",
      )
      .addOption(tokenOption)
      .addOption(changeProjectPathOption)
      .addOption(metricsPeriodOption)
      .addOption(jsonOption)
      .action(
        async (
          changeId: string,
          options: BaseCommandOptions & MetricsPeriodOption,
        ) => {
          try {
            const { client, owner, project } =
              await resolveProjectTarget(options);
            const result = await opts.perform({
              client,
              owner,
              project,
              changeId,
              metricsPeriod: toMetricsPeriod(options.metricsPeriod),
            });
            output(result, options, formatChange);
          } catch (error) {
            handleCliError(error, "user");
          }
        },
      );
  };
}
