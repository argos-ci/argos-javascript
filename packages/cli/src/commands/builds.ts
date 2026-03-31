import type { Command } from "commander";
import { Option } from "commander";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { tokenOption, type TokenOption } from "../options";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type SnapshotDiffStatus = SnapshotDiff["status"];

type SimplifiedBuildStatus = "failure" | "success" | "pending";

function getToken(options: TokenOption): string {
  const token = options.token ?? process.env["ARGOS_TOKEN"];
  if (!token) {
    console.error(
      "Error: No Argos token found. Use --token or set ARGOS_TOKEN.",
    );
    process.exit(1);
  }
  return token;
}

function getAPIBaseURL(): string | undefined {
  return process.env["ARGOS_API_BASE_URL"];
}

function createBuildsClient(options: TokenOption) {
  return createClient({
    authToken: getToken(options),
    baseUrl: getAPIBaseURL(),
  });
}

function getSimplifiedStatus(build: Build): SimplifiedBuildStatus {
  switch (build.status) {
    case "accepted":
    case "no-changes":
      return "success";

    case "rejected":
    case "changes-detected":
    case "expired":
    case "error":
    case "aborted":
      return "failure";

    default:
      return "pending";
  }
}

function isBuildPending(build: Build): boolean {
  return getSimplifiedStatus(build) === "pending";
}

function parseBuildReferenceOrExit(buildReference: string): number {
  const parsedBuildNumber = Number(buildReference);
  if (
    Number.isFinite(parsedBuildNumber) &&
    Number.isInteger(parsedBuildNumber)
  ) {
    return parsedBuildNumber;
  }

  const urlMatch = buildReference.match(/\/builds\/(\d+)(?:\/?$|[?#])/);
  if (urlMatch) {
    return Number(urlMatch[1]);
  }

  console.error(
    `Error: Build reference must be a valid build number or Argos build URL, got "${buildReference}".`,
  );
  process.exit(1);
}

function getBuildJSON(build: Build) {
  return {
    id: build.id,
    number: build.number,
    status: getSimplifiedStatus(build),
    rawStatus: build.status,
    conclusion: build.conclusion,
    branch: build.head?.branch ?? null,
    commit: build.head?.sha ?? null,
    baseBranch: build.base?.branch ?? null,
    baseCommit: build.base?.sha ?? null,
    url: build.url,
    stats: build.stats,
    testReport: build.metadata?.testReport ?? null,
    notification: build.notification,
  };
}

function getSnapshotJSON(diff: SnapshotDiff, build: Build) {
  return {
    id: diff.id,
    name: diff.name,
    status: diff.status,
    score: diff.score,
    buildUrl: build.url,
    reviewUrl: `${build.url}/${diff.id}`,
    diffImageUrl: diff.url,
    group: diff.group,
    parentName: diff.parentName,
    base: diff.base
      ? {
          id: diff.base.id,
          name: diff.base.name,
          imageUrl: diff.base.url,
          contentType: diff.base.contentType,
          width: diff.base.width,
          height: diff.base.height,
          pageUrl: diff.base.metadata?.url ?? null,
          previewUrl: diff.base.metadata?.previewUrl ?? null,
          viewport: diff.base.metadata?.viewport ?? null,
          browser: diff.base.metadata?.browser ?? null,
          automationLibrary: diff.base.metadata?.automationLibrary ?? null,
          sdk: diff.base.metadata?.sdk ?? null,
          test: diff.base.metadata?.test ?? null,
          story: diff.base.metadata?.story ?? null,
          tags: diff.base.metadata?.tags ?? null,
        }
      : null,
    head: diff.head
      ? {
          id: diff.head.id,
          name: diff.head.name,
          imageUrl: diff.head.url,
          contentType: diff.head.contentType,
          width: diff.head.width,
          height: diff.head.height,
          pageUrl: diff.head.metadata?.url ?? null,
          previewUrl: diff.head.metadata?.previewUrl ?? null,
          viewport: diff.head.metadata?.viewport ?? null,
          browser: diff.head.metadata?.browser ?? null,
          automationLibrary: diff.head.metadata?.automationLibrary ?? null,
          sdk: diff.head.metadata?.sdk ?? null,
          test: diff.head.metadata?.test ?? null,
          story: diff.head.metadata?.story ?? null,
          tags: diff.head.metadata?.tags ?? null,
        }
      : null,
  };
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatStats(stats: Build["stats"] | null | undefined): string {
  if (!stats) {
    return "-";
  }

  return [
    `total ${stats.total}`,
    `changed ${stats.changed}`,
    `added ${stats.added}`,
    `removed ${stats.removed}`,
    `unchanged ${stats.unchanged}`,
  ].join(", ");
}

function formatSnapshotSummary(diffs: SnapshotDiff[]): string {
  const counts = new Map<SnapshotDiffStatus, number>();
  for (const diff of diffs) {
    counts.set(diff.status, (counts.get(diff.status) ?? 0) + 1);
  }

  const orderedStatuses: SnapshotDiffStatus[] = [
    "changed",
    "added",
    "removed",
    "unchanged",
    "ignored",
    "pending",
    "failure",
    "retryFailure",
  ];

  return orderedStatuses
    .map((status) => {
      const count = counts.get(status);
      return count ? `${status} ${count}` : null;
    })
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function printBuild(build: Build) {
  const buildJSON = getBuildJSON(build);
  const lines = [
    `Build #${buildJSON.number}`,
    `Status: ${buildJSON.status} (${buildJSON.rawStatus})`,
    `Snapshots: ${formatStats(buildJSON.stats)}`,
    `Conclusion: ${formatValue(buildJSON.conclusion)}`,
    `Branch: ${formatValue(buildJSON.branch)}`,
    `Commit: ${formatValue(buildJSON.commit)}`,
    `Base branch: ${formatValue(buildJSON.baseBranch)}`,
    `Base commit: ${formatValue(buildJSON.baseCommit)}`,
    `URL: ${buildJSON.url}`,
  ];

  console.log(lines.join("\n"));
}

function printSnapshots(diffs: SnapshotDiff[], build: Build) {
  if (diffs.length === 0) {
    console.log("No snapshots found.");
    return;
  }

  const lines = [
    `Snapshots for build #${build.number}`,
    `Count: ${diffs.length}`,
    `Summary: ${formatSnapshotSummary(diffs)}`,
    "",
    ...diffs.flatMap((diff) => {
      const snapshot = getSnapshotJSON(diff, build);
      return [
        `${snapshot.name} [${snapshot.status}]`,
        `  Review: ${snapshot.reviewUrl}`,
        `  Diff image: ${formatValue(snapshot.diffImageUrl)}`,
        `  Base image: ${formatValue(snapshot.base?.imageUrl)}`,
        `  Head image: ${formatValue(snapshot.head?.imageUrl)}`,
        `  Score: ${formatValue(snapshot.score)}`,
        `  Group: ${formatValue(snapshot.group)}`,
        "",
      ];
    }),
  ];

  console.log(lines.slice(0, -1).join("\n"));
}

async function fetchAllDiffs(
  client: ReturnType<typeof createClient>,
  buildId: string,
  options?: { needsReview?: boolean },
): Promise<SnapshotDiff[]> {
  const results: SnapshotDiff[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const query = {
      page: String(page),
      perPage: String(perPage),
      ...(options?.needsReview ? ({ needsReview: true } as const) : {}),
    };
    const { data, error } = await client.GET("/builds/{buildId}/diffs", {
      params: {
        path: { buildId },
        query: query as never,
      },
    });

    if (error || !data) {
      if (error) {
        throwAPIError(error);
      }
      throw new Error("Unexpected empty response from API.");
    }

    results.push(...data.results);

    if (results.length >= data.pageInfo.total) {
      break;
    }
    page++;
  }

  return results;
}

async function fetchBuildByNumber(
  client: ReturnType<typeof createClient>,
  buildNumber: number,
  errorLabel: string,
): Promise<Build> {
  const { data, error, response } = await client.GET(
    "/project/builds/{buildNumber}",
    { params: { path: { buildNumber } } },
  );

  if (error) {
    if (response.status === 404) {
      console.error(`Error: Build number ${errorLabel} not found.`);
      process.exit(1);
    }
    throwAPIError(error);
  }

  if (!data) {
    console.error("Error: Unexpected empty response from API.");
    process.exit(1);
  }

  return data;
}

export function buildsCommand(program: Command) {
  const builds = program.command("builds").description("Manage Argos builds");
  const createJsonOption = () =>
    new Option(
      "--json",
      "Output machine-readable JSON instead of human-readable text",
    );

  builds
    .command("get")
    .description("Fetch build metadata")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(tokenOption)
    .addOption(createJsonOption())
    .action(
      async (
        buildReference: string,
        options: TokenOption & { json?: boolean },
      ) => {
        const buildNumber = parseBuildReferenceOrExit(buildReference);
        const client = createBuildsClient(options);
        const build = await fetchBuildByNumber(
          client,
          buildNumber,
          buildReference,
        );
        if (options.json) {
          console.log(JSON.stringify(getBuildJSON(build), null, 2));
          return;
        }
        printBuild(build);
      },
    );

  builds
    .command("snapshots")
    .description("Fetch snapshot diffs for a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .option("--needs-review", "Only include snapshot diffs that require review")
    .addOption(tokenOption)
    .addOption(createJsonOption())
    .action(
      async (
        buildReference: string,
        options: TokenOption & { needsReview?: boolean; json?: boolean },
      ) => {
        const buildNumber = parseBuildReferenceOrExit(buildReference);
        const client = createBuildsClient(options);
        const build = await fetchBuildByNumber(
          client,
          buildNumber,
          buildReference,
        );

        if (isBuildPending(build)) {
          if (options.json) {
            console.error(
              `Error: Build #${build.number} is still processing (${build.status}). Try again in a moment.`,
            );
            process.exit(1);
          }

          console.log(
            `Build #${build.number} is still processing (${build.status}). Try again in a moment.`,
          );
          return;
        }

        const diffs = await fetchAllDiffs(client, build.id, {
          needsReview: Boolean(options.needsReview),
        });

        if (options.json) {
          console.log(
            JSON.stringify(
              diffs.map((diff) => getSnapshotJSON(diff, build)),
              null,
              2,
            ),
          );
          return;
        }

        printSnapshots(diffs, build);
      },
    );
}
