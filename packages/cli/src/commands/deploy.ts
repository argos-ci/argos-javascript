import { resolve } from "node:path";
import type { Command } from "commander";
import { Option } from "commander";
import { deploy } from "@argos-ci/core";
import ora from "ora";
import { tokenOption, type TokenOption } from "../options";

type DeployOptions = TokenOption & {
  prod?: boolean;
};

export function deployCommand(program: Command) {
  program
    .command("deploy")
    .argument("<directory>", "Directory of the static build to deploy")
    .description(
      "Deploy a static build (Storybook or any static site) to Argos",
    )
    .addOption(tokenOption)
    .addOption(
      new Option("--prod", "Deploy as a production deployment").default(false),
    )
    .action(async (directory: string, options: DeployOptions) => {
      const spinner = ora("Deploying").start();
      try {
        const result = await deploy({
          token: options.token,
          root: resolve(directory),
          environment: options.prod ? "production" : undefined,
        });
        spinner.succeed(`Deployed: ${result.url}`);
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`Deploy failed: ${error.message}`);
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
