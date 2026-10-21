import type { ArgosAPISchema } from "@argos-ci/api-client";
import type { MetricsPeriod } from "../options";
import { unwrap } from "./api";
import type { BuildTarget } from "./target";

export type Build = ArgosAPISchema.components["schemas"]["Build"];
export type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];

const PER_PAGE = 100;

/** Whether Argos is still processing the build, so its diffs are not final. */
export function isBuildPending(build: Build): boolean {
  return build.status === "pending" || build.status === "progress";
}

export async function fetchBuild(target: BuildTarget): Promise<Build> {
  const { client, owner, project, buildNumber } = target;
  return unwrap(
    await client.GET("/projects/{owner}/{project}/builds/{buildNumber}", {
      params: { path: { owner, project, buildNumber } },
    }),
  );
}

/** Fetch every diff of a build, following pagination. */
export async function fetchAllDiffs(
  target: BuildTarget,
  options: { needsReview?: boolean; metricsPeriod?: MetricsPeriod } = {},
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
              ...(options.metricsPeriod
                ? { metricsPeriod: options.metricsPeriod }
                : {}),
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
