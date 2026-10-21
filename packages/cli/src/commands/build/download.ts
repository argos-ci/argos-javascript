import { resolve } from "node:path";
import type { Command } from "commander";
import { fetchAllDiffs, fetchBuild, isBuildPending } from "../../lib/build";
import { fail } from "../../lib/cli-error";
import {
  assertEmptyDirectory,
  downloadBuildSnapshots,
} from "../../lib/download";
import { formatSnapshotDownload } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveBuildTarget } from "../../lib/target";
import { buildProjectPathOption, jsonOption, tokenOption } from "../../options";

type DownloadOptions = BaseCommandOptions & {
  output?: string | undefined;
};

export function registerBuildDownload(build: Command) {
  build
    .command("download")
    .description(
      "Download the screenshots of a build to a directory, laid out by snapshot name",
    )
    .argument("<buildReference>", "Build number or Argos build URL")
    .option(
      "-o, --output <directory>",
      "Directory to write the screenshots to. Must be empty or not exist yet. Defaults to ./argos-build-<number>",
    )
    .addOption(tokenOption)
    .addOption(buildProjectPathOption)
    .addOption(jsonOption)
    .action(async (reference: string, options: DownloadOptions) => {
      try {
        const target = await resolveBuildTarget(reference, options, {
          auth: "project",
        });
        const directory = resolve(
          options.output ?? `argos-build-${target.buildNumber}`,
        );
        await assertEmptyDirectory(directory);

        const build = await fetchBuild(target);
        if (isBuildPending(build)) {
          fail(
            `Build #${build.number} is still processing (${build.status}). Try again in a moment.`,
          );
        }

        const diffs = await fetchAllDiffs(target);
        const download = await downloadBuildSnapshots({
          build,
          diffs,
          directory,
          json: options.json,
        });
        output(download, options, (data) => formatSnapshotDownload(data));
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
