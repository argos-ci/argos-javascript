import type { Command } from "commander";
import { skip } from "@argos-ci/core";
import ora from "ora";
import {
  buildNameOption,
  projectOption,
  tokenOption,
  type BuildNameOption,
  type ProjectOption,
  type TokenOption,
} from "../options";

type SkipOptions = TokenOption & ProjectOption & BuildNameOption;

export function skipCommand(program: Command) {
  program
    .command("skip")
    .description("Mark a build as skipped")
    .addOption(tokenOption)
    .addOption(projectOption)
    .addOption(buildNameOption)
    .action(async (options: SkipOptions) => {
      const spinner = ora("Creating skipped build").start();
      try {
        const result = await skip({
          token: options.token,
          project: options.project,
          buildName: options.buildName,
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
