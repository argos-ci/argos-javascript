import type { Command } from "commander";
import { Option } from "commander";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { tokenOption, type TokenOption } from "../options";
import { getStoredToken } from "../auth";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type Project = ArgosAPISchema.components["schemas"]["Project"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type SnapshotDiffStatus = SnapshotDiff["status"];

async function getTokenOrThrow(options: TokenOption): Promise<string> {
  const token =
    options.token ?? process.env["ARGOS_TOKEN"] ?? (await getStoredToken());
  if (!token) {
    console.error(
      "Error: No Argos token found. Use --token, set ARGOS_TOKEN, or run `argos login`.",
    );
    process.exit(1);
  }
  return token;
}

function getAPIBaseURL(): string | undefined {
  return process.env["ARGOS_API_BASE_URL"];
}

async function createBuildsClient(options: TokenOption) {
  const authToken = await getTokenOrThrow(options);
  return createClient({ authToken, baseUrl: getAPIBaseURL() });
}

function isBuildPending(build: Build): boolean {
  return build.status === "pending" || build.status === "progress";
}

function parseBuildReferenceOrExit(buildReference: string): number {
  const parsedBuildNumber = Number(buildReference);
  if (
    Number.isFinite(parsedBuildNumber) &&
    Number.isInteger(parsedBuildNumber)
  ) {
    return parsedBuildNumber;
  }

  const urlMatch = buildReference.match(
    /^https:\/\/app\.argos-ci\.(?:com|dev(?::\d+)?)\/.+\/builds\/(\d+)(?:\/?$|[?#])/,
  );
  if (urlMatch) {
    return Number(urlMatch[1]);
  }

  console.error(
    `Error: Build reference must be a valid build number or Argos build URL (https://app.argos-ci.com/.../builds/<number>), got "${buildReference}".`,
  );
  process.exit(1);
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
  const lines = [
    `Build #${build.number}`,
    `Status: ${build.status}`,
    `Snapshots: ${formatStats(build.stats)}`,
    `Conclusion: ${formatValue(build.conclusion)}`,
    `Branch: ${formatValue(build.head?.branch)}`,
    `Commit: ${formatValue(build.head?.sha)}`,
    `Base branch: ${formatValue(build.base?.branch)}`,
    `Base commit: ${formatValue(build.base?.sha)}`,
    `URL: ${build.url}`,
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
      return [
        `${diff.name} [${diff.status}]`,
        `  Review: ${build.url}/${diff.id}`,
        `  Mask: ${formatValue(diff.url)}`,
        `  Base file: ${formatValue(diff.base?.url)}`,
        `  Head file: ${formatValue(diff.head?.url)}`,
        `  Score: ${formatValue(diff.score)}`,
        `  Group: ${formatValue(diff.group)}`,
        "",
      ];
    }),
  ];

  console.log(lines.slice(0, -1).join("\n"));
}

async function fetchAllDiffs(
  client: ReturnType<typeof createClient>,
  project: Project,
  buildNumber: number,
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
    const { data, error } = await client.GET(
      "/projects/{owner}/{project}/builds/{buildNumber}/diffs",
      {
        params: {
          path: {
            owner: project.account.slug,
            project: project.name,
            buildNumber,
          },
          query: query as never,
        },
      },
    );

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

async function fetchProject(
  client: ReturnType<typeof createClient>,
): Promise<Project> {
  const { data, error } = await client.GET("/project");

  if (error) {
    throwAPIError(error);
  }

  if (!data) {
    console.error("Error: Unexpected empty response from API.");
    process.exit(1);
  }

  return data;
}

async function fetchBuildByNumber(
  client: ReturnType<typeof createClient>,
  project: Project,
  buildNumber: number,
  errorLabel: string,
): Promise<Build> {
  const { data, error, response } = await client.GET(
    "/projects/{owner}/{project}/builds/{buildNumber}",
    {
      params: {
        path: {
          owner: project.account.slug,
          project: project.name,
          buildNumber,
        },
      },
    },
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

export function buildCommand(program: Command) {
  const build = program.command("build").description("Manage Argos builds");
  const createJsonOption = () =>
    new Option(
      "--json",
      "Output machine-readable JSON instead of human-readable text",
    );

  build
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
        const client = await createBuildsClient(options);
        const project = await fetchProject(client);
        const build = await fetchBuildByNumber(
          client,
          project,
          buildNumber,
          buildReference,
        );
        if (options.json) {
          console.log(JSON.stringify(build, null, 2));
          return;
        }
        printBuild(build);
      },
    );

  build
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
        const client = await createBuildsClient(options);
        const project = await fetchProject(client);
        const build = await fetchBuildByNumber(
          client,
          project,
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

        const diffs = await fetchAllDiffs(client, project, build.number, {
          needsReview: Boolean(options.needsReview),
        });

        if (options.json) {
          console.log(JSON.stringify(diffs, null, 2));
          return;
        }

        printSnapshots(diffs, build);
      },
    );
}
