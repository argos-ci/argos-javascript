import type { Command } from "commander";
import { fetchAllDiffs, fetchBuild, isBuildPending } from "../../lib/build";
import { formatSnapshots } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveBuildTarget } from "../../lib/target";
import {
  jsonOption,
  metricsPeriodOption,
  type MetricsPeriodOption,
  toMetricsPeriod,
  tokenOption,
} from "../../options";
import { Option } from "commander";

export function registerBuildSnapshots(build: Command) {
  build
    .command("snapshots")
    .description("Fetch snapshot diffs for a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(
      new Option(
        "--needs-review",
        "Only include snapshot diffs that require review",
      ),
    )
    .addOption(metricsPeriodOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      async (
        reference: string,
        options: BaseCommandOptions &
          MetricsPeriodOption & { needsReview?: boolean },
      ) => {
        try {
          const target = await resolveBuildTarget(reference, options, {
            auth: "project",
          });
          const build = await fetchBuild(target);

          if (isBuildPending(build)) {
            const message = `Build #${build.number} is still processing (${build.status}). Try again in a moment.`;
            if (options.json) {
              console.error(`Error: ${message}`);
              process.exit(1);
            }
            console.log(message);
            return;
          }

          const diffs = await fetchAllDiffs(target, {
            needsReview: Boolean(options.needsReview),
            metricsPeriod: toMetricsPeriod(options.metricsPeriod),
          });
          output(diffs, options, (data) => formatSnapshots(data, build));
        } catch (error) {
          handleCliError(error, "project");
        }
      },
    );
}
