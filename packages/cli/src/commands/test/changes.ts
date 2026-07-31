import { Option, type Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { formatTestChanges } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget, type ProjectTarget } from "../../lib/target";
import {
  jsonOption,
  metricsPeriodOption,
  testProjectPathOption,
  toMetricsPeriod,
  tokenOption,
  type MetricsPeriod,
  type MetricsPeriodOption,
} from "../../options";

type TestChange = ArgosAPISchema.components["schemas"]["TestChange"];

const PER_PAGE = 100;

/** The two values the API's `ignored` filter accepts. */
type IgnoredFilter = "true" | "false";

const IGNORED_CHOICES = ["true", "false"] as const satisfies IgnoredFilter[];

const ignoredOption = new Option(
  "--ignored <boolean>",
  "Only the changes currently ignored (`true`) or only the ones still under review (`false`)",
).choices(IGNORED_CHOICES);

/** Fetch every change of a test, following pagination. */
async function fetchAllChanges(
  target: ProjectTarget,
  testId: string,
  options: {
    metricsPeriod: MetricsPeriod;
    ignored?: IgnoredFilter | undefined;
  },
): Promise<TestChange[]> {
  const { client, owner, project } = target;
  const results: TestChange[] = [];
  for (let page = 1; ; page++) {
    const data = unwrap(
      await client.GET("/projects/{owner}/{project}/tests/{testId}/changes", {
        params: {
          path: { owner, project, testId },
          query: {
            page: String(page),
            perPage: String(PER_PAGE),
            metricsPeriod: options.metricsPeriod,
            ...(options.ignored ? { ignored: options.ignored } : {}),
          },
        },
      }),
    );
    results.push(...data.results);
    if (results.length >= data.pageInfo.total || data.results.length === 0) {
      break;
    }
  }
  return results;
}

export function registerTestChanges(test: Command) {
  test
    .command("changes")
    .description(
      "List the distinct changes a test produced over a period, most frequent first",
    )
    .argument(
      "<testId>",
      "Test ID, taken from a diff's `test.id` (see `argos build snapshots`)",
    )
    .addOption(ignoredOption)
    .addOption(tokenOption)
    .addOption(testProjectPathOption)
    .addOption(metricsPeriodOption)
    .addOption(jsonOption)
    .action(
      async (
        testId: string,
        options: BaseCommandOptions &
          MetricsPeriodOption & { ignored?: IgnoredFilter },
      ) => {
        try {
          const target = await resolveProjectTarget(options, {
            auth: "project",
          });
          const changes = await fetchAllChanges(target, testId, {
            metricsPeriod: toMetricsPeriod(options.metricsPeriod),
            ignored: options.ignored,
          });
          output(changes, options, formatTestChanges);
        } catch (error) {
          handleCliError(error, "project");
        }
      },
    );
}
