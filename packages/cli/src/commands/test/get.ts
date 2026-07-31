import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatTest } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  jsonOption,
  metricsPeriodOption,
  testProjectPathOption,
  toMetricsPeriod,
  tokenOption,
  type MetricsPeriodOption,
} from "../../options";

export function registerTestGet(test: Command) {
  test
    .command("get")
    .description("Fetch a test and its flakiness metrics")
    .argument(
      "<testId>",
      "Test ID, taken from a diff's `test.id` (see `argos build snapshots`)",
    )
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(metricsPeriodOption)
    .addOption(jsonOption)
    .action(
      async (
        testId: string,
        options: BaseCommandOptions & MetricsPeriodOption,
      ) => {
        try {
          const { client, owner, project } = await resolveProjectTarget(
            options,
            { auth: "project" },
          );
          const result = unwrap(
            await client.GET("/projects/{owner}/{project}/tests/{testId}", {
              params: {
                path: { owner, project, testId },
                query: {
                  metricsPeriod: toMetricsPeriod(options.metricsPeriod),
                },
              },
            }),
          );
          output(result, options, formatTest);
        } catch (error) {
          handleCliError(error, "project");
        }
      },
    );
}
