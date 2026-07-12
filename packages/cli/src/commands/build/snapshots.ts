import type { Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { formatSnapshots } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveBuildTarget, type BuildTarget } from "../../lib/target";
import {
  jsonOption,
  metricsPeriodOption,
  type MetricsPeriod,
  type MetricsPeriodOption,
  toMetricsPeriod,
  tokenOption,
} from "../../options";
import { Option } from "commander";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];

const PER_PAGE = 100;

function isBuildPending(build: Build): boolean {
  return build.status === "pending" || build.status === "progress";
}

async function fetchBuild(target: BuildTarget): Promise<Build> {
  const { client, owner, project, buildNumber } = target;
  return unwrap(
    await client.GET("/projects/{owner}/{project}/builds/{buildNumber}", {
      params: { path: { owner, project, buildNumber } },
    }),
  );
}

/** Fetch every diff of a build, following pagination. */
async function fetchAllDiffs(
  target: BuildTarget,
  options: { needsReview: boolean; metricsPeriod: MetricsPeriod },
): Promise<SnapshotDiff[]> {
  const { client, owner, project, buildNumber } = target;
  const results: SnapshotDiff[] = [];
  for (let page = 1; ; page++) {
    const data = unwrap(
      await client.GET(
        "/projects/{owner}/{project}/builds/{buildNumber}/diffs",
        {
          params: {
            path: { owner, project, buildNumber },
            query: {
              page: String(page),
              perPage: String(PER_PAGE),
              metricsPeriod: options.metricsPeriod,
              ...(options.needsReview ? { needsReview: "true" } : {}),
            },
          },
        },
      ),
    );
    results.push(...data.results);
    if (results.length >= data.pageInfo.total || data.results.length === 0) {
      break;
    }
  }
  return results;
}

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
