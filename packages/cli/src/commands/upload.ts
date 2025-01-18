import type { Command } from "commander";
import { Option } from "commander";
import { upload } from "@argos-ci/core";
import ora from "ora";
import { parallelNonce } from "../options";

export function uploadCommand(program: Command) {
  program
    .command("upload")
    .argument("<directory>", "Directory to upload")
    .description("Upload screenshots to Argos")
    .option(
      "-f, --files <patterns...>",
      "One or more globs matching image file paths to upload",
      "**/*.{png,jpg,jpeg}",
    )
    .option(
      "-i, --ignore <patterns...>",
      'One or more globs matching image file paths to ignore (ex: "**/*.png **/diff.jpg")',
    )
    .addOption(
      new Option("--token <token>", "Repository token").env("ARGOS_TOKEN"),
    )
    .addOption(
      new Option(
        "--build-name <string>",
        "Name of the build, in case you want to run multiple Argos builds in a single CI job",
      ).env("ARGOS_BUILD_NAME"),
    )
    .addOption(
      new Option(
        "--mode <string>",
        "Mode of comparison applied. CI for visual regression testing, monitoring for visual monitoring.",
      )
        .default("ci")
        .choices(["ci", "monitoring"])
        .env("ARGOS_MODE"),
    )
    .addOption(
      new Option(
        "--parallel",
        "Enable parallel mode. Run multiple Argos builds and combine them at the end",
      ).env("ARGOS_PARALLEL"),
    )
    .addOption(
      new Option(
        "--parallel-total <number>",
        "The number of parallel nodes being ran",
      ).env("ARGOS_PARALLEL_TOTAL"),
    )
    .addOption(parallelNonce)
    .addOption(
      new Option(
        "--parallel-index <number>",
        "The index of the parallel node being ran",
      ).env("ARGOS_PARALLEL_INDEX"),
    )
    .addOption(
      new Option(
        "--reference-branch <string>",
        "Branch used as baseline for screenshot comparison",
      ).env("ARGOS_REFERENCE_BRANCH"),
    )
    .addOption(
      new Option(
        "--reference-commit <string>",
        "Commit used as baseline for screenshot comparison",
      ).env("ARGOS_REFERENCE_COMMIT"),
    )
    .addOption(
      new Option(
        "--threshold <number>",
        "Sensitivity threshold between 0 and 1. The higher the threshold, the less sensitive the diff will be. Default to 0.5",
      ).env("ARGOS_THRESHOLD"),
    )
    .action(async (directory, options) => {
      const spinner = ora("Uploading screenshots").start();
      try {
        const result = await upload({
          token: options.token,
          root: directory,
          buildName: options.buildName,
          files: options.files,
          ignore: options.ignore,
          prNumber: options.pullRequest
            ? Number(options.pullRequest)
            : undefined,
          parallel: options.parallel
            ? {
                nonce: options.parallelNonce,
                total: options.parallelTotal,
                index: options.parallelIndex,
              }
            : false,
          referenceBranch: options.referenceBranch,
          referenceCommit: options.referenceCommit,
          mode: options.mode,
          threshold: options.threshold,
        });
        spinner.succeed(`Build created: ${result.build.url}`);
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`Build failed: ${error.message}`);
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
