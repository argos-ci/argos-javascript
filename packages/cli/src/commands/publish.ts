import { resolve } from "node:path";
import type { Command } from "commander";
import { InvalidArgumentError, Option } from "commander";
import { deploy } from "@argos-ci/core";
import ora from "ora";
import { tokenOption, type TokenOption } from "../options";

type PublishOptions = TokenOption & {
  environment?: "preview" | "production";
  commit?: string;
  branch?: string;
  prNumber?: number;
};

function parsePrNumber(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError("pull request number must be a positive integer");
  }

  const prNumber = Number(value);
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    throw new InvalidArgumentError("pull request number must be a positive integer");
  }

  return prNumber;
}

export function publishCommand(program: Command) {
  program
    .command("publish")
    .alias("deploy")
    .argument("<directory>", "Directory of the static build to publish")
    .description(
      "Publish a static build (Storybook or any static site) to Argos",
    )
    .addOption(tokenOption)
    .addOption(
      new Option("--environment <string>", "Deployment environment")
        .choices(["preview", "production"])
        .default("preview")
        .env("ARGOS_ENVIRONMENT"),
    )
    .addOption(
      new Option("--commit <string>", "Git commit SHA").env("ARGOS_COMMIT"),
    )
    .addOption(
      new Option("--branch <string>", "Git branch name").env("ARGOS_BRANCH"),
    )
    .addOption(
      new Option("--pr-number <number>", "Pull request number")
        .argParser(parsePrNumber)
        .env("ARGOS_PR_NUMBER"),
    )
    .action(async (directory: string, options: PublishOptions) => {
      const spinner = ora("Publishing").start();
      try {
        const result = await deploy({
          token: options.token,
          root: resolve(directory),
          environment: options.environment,
          commit: options.commit ?? undefined,
          branch: options.branch ?? undefined,
          prNumber: options.prNumber,
        });
        spinner.succeed(`Published: ${result.url}`);
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`Publish failed: ${error.message}`);
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
