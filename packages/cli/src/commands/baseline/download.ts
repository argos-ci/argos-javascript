import { resolve } from "node:path";
import { APIError, type ArgosAPIClient } from "@argos-ci/api-client";
import { Option, type Command } from "commander";
import { createApiClient, unwrap } from "../../lib/api";
import {
  BASELINE_PAGE_SIZE,
  findLatestBaseline,
  MAX_BASELINE_PAGES,
} from "../../lib/baseline";
import { fetchAllDiffs, type SnapshotDiff } from "../../lib/build";
import { fail } from "../../lib/cli-error";
import {
  assertEmptyDirectory,
  downloadBuildSnapshots,
} from "../../lib/download";
import { formatSnapshotDownload } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveOptionalToken } from "../../lib/target";
import {
  jsonOption,
  tokenOption,
  type JsonOption,
  type TokenOption,
} from "../../options";

type DownloadOptions = TokenOption &
  JsonOption & {
    output?: string | undefined;
    branch?: string | undefined;
    buildName: string;
    mode: "ci" | "monitoring";
  };

// The baseline lookup (`POST /baseline`) only accepts a project token, and the
// project it searches is the token's own.
const PROJECT_TOKEN_HINT =
  "Finding the baseline takes the project's token: pass it with --token or set ARGOS_TOKEN. The token stored by `argos login` cannot be used.";

// Failure screenshots are never compared to anything, so they are no one's
// baseline.
const FAILURE_STATUSES = new Set<SnapshotDiff["status"]>([
  "failure",
  "retryFailure",
]);

async function fetchTokenProject(client: ArgosAPIClient) {
  try {
    return unwrap(await client.GET("/project"));
  } catch (error) {
    if (
      error instanceof APIError &&
      (error.status === 401 || error.status === 403)
    ) {
      fail(`${error.message}\n${PROJECT_TOKEN_HINT}`);
    }
    throw error;
  }
}

export function registerBaselineDownload(baseline: Command) {
  baseline
    .command("download")
    .description(
      "Download a project's latest baseline: the screenshots of the newest build of its default branch that Argos can use as a baseline",
    )
    .option(
      "-o, --output <directory>",
      "Directory to write the screenshots to, laid out by snapshot name. Must be empty or not exist yet. Defaults to ./argos-baseline",
    )
    .option(
      "--branch <name>",
      "Branch to take the baseline from. Defaults to the project's default base branch",
    )
    .addOption(
      new Option(
        "--build-name <name>",
        "Name of the build to take the baseline of, as given to `argos upload --build-name`",
      ).default("default"),
    )
    .addOption(
      new Option(
        "--mode <mode>",
        "Mode of the build to take the baseline of: ci for visual regression testing, monitoring for visual monitoring",
      )
        .choices(["ci", "monitoring"])
        .default("ci"),
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (options: DownloadOptions) => {
      try {
        const directory = resolve(options.output ?? "argos-baseline");
        await assertEmptyDirectory(directory);

        const token = await resolveOptionalToken(options);
        if (!token) {
          fail(
            "No Argos token found. Pass the project's token with --token or set ARGOS_TOKEN.",
          );
        }
        const client = createApiClient(token);
        const project = await fetchTokenProject(client);
        const path = { owner: project.account.slug, project: project.name };
        const branch = options.branch ?? project.defaultBaseBranch;

        const build = await findLatestBaseline({
          listBuilds: async (page) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/builds", {
                params: {
                  path,
                  query: {
                    head: branch,
                    page: String(page),
                    perPage: String(BASELINE_PAGE_SIZE),
                  },
                },
              }),
            ),
          findBaseline: async (commits) =>
            unwrap(
              await client.POST("/baseline", {
                body: { commits, name: options.buildName, mode: options.mode },
              }),
            ).baseline,
        });
        if (!build) {
          fail(
            `No baseline found on branch "${branch}" for build name "${options.buildName}" (${options.mode} mode). Check --branch, --build-name and --mode; only the latest ${MAX_BASELINE_PAGES * BASELINE_PAGE_SIZE} builds of the branch are searched.`,
          );
        }

        const diffs = await fetchAllDiffs({
          client,
          ...path,
          buildNumber: String(build.number),
        });
        const download = await downloadBuildSnapshots({
          build,
          diffs: diffs.filter((diff) => !FAILURE_STATUSES.has(diff.status)),
          directory,
          json: options.json,
        });
        output(download, options, (data) =>
          formatSnapshotDownload(data, "baseline snapshot"),
        );
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
