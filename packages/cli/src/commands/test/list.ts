import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatTests } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import { handleCliError, output } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  jsonOption,
  limitOption,
  metricsPeriodOption,
  testProjectPathOption,
  toLimit,
  toMetricsPeriod,
  tokenOption,
  type LimitOption,
  type MetricsPeriodOption,
} from "../../options";
import type { BaseCommandOptions } from "../../lib/run";

type ListOptions = BaseCommandOptions &
  MetricsPeriodOption &
  LimitOption & {
    buildName?: string | undefined;
    search?: string | undefined;
  };

export function registerTestList(test: Command) {
  test
    .command("list")
    .description(
      "List the tests currently running in a project, flakiest first — the project's flakiness backlog",
    )
    .option(
      "--build-name <name>",
      "Restrict to the tests of a single build name",
    )
    .option("--search <query>", "Match tests on their name")
    .addOption(limitOption)
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(metricsPeriodOption)
    .addOption(jsonOption)
    .action(async (options: ListOptions) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "project",
        });
        const tests = await fetchPages(
          toLimit(options.limit),
          async (pagination) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/tests", {
                params: {
                  path: { owner, project },
                  query: {
                    ...pagination,
                    metricsPeriod: toMetricsPeriod(options.metricsPeriod),
                    ...(options.buildName
                      ? { buildName: options.buildName }
                      : {}),
                    ...(options.search ? { search: options.search } : {}),
                  },
                },
              }),
            ),
        );
        output(tests, options, formatTests);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
