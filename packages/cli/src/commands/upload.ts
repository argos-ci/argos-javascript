import type { Command } from "commander";
import { Option } from "commander";
import { upload } from "@argos-ci/core";
import ora from "ora";
import {
  buildNameOption,
  parallelNonceOption,
  tokenOption,
  type BuildNameOption,
  type ParallelNonceOption,
  type TokenOption,
} from "../options";

type UploadOptions = BuildNameOption &
  ParallelNonceOption &
  TokenOption & {
    files?: string[] | undefined;
    ignore?: string[] | undefined;
    mode?: "ci" | "monitoring" | undefined;
    parallel?: boolean | undefined;
    parallelTotal?: number | undefined;
    parallelIndex?: number | undefined;
    referenceBranch?: string | undefined;
    referenceCommit?: string | undefined;
    threshold?: number | undefined;
    subset?: boolean | undefined;
  };

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
    .addOption(tokenOption)
    .addOption(buildNameOption)
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
    .addOption(parallelNonceOption)
    .addOption(
      new Option(
        "--parallel-index <number>",
        "The index of the parallel node being ran (must be at least 1)",
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
    .addOption(
      new Option(
        "--subset",
        "Whether this build contains only a subset of screenshots.\nThis is useful when a build is created from an incomplete test suite where some tests are skipped.",
      ).env("ARGOS_SUBSET"),
    )
    .action(async (directory: string, options: UploadOptions) => {
      const spinner = ora("Uploading screenshots").start();
      try {
        const parallel = (() => {
          if (!options.parallel) {
            return undefined;
          }
          if (!options.parallelNonce) {
            spinner.fail("--parallel-nonce is required if --parallel is set");
            process.exit(1);
          }
          if (!options.parallelTotal) {
            spinner.fail("--parallel-total is required if --parallel is set");
            process.exit(1);
          }
          return {
            nonce: options.parallelNonce,
            total: options.parallelTotal,
            index: options.parallelIndex,
          };
        })();
        const result = await upload({
          token: options.token,
          root: directory,
          buildName: options.buildName,
          files: options.files,
          ignore: options.ignore,
          parallel,
          referenceBranch: options.referenceBranch,
          referenceCommit: options.referenceCommit,
          mode: options.mode,
          threshold: options.threshold,
          subset: options.subset,
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
