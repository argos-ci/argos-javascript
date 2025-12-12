import type { Command } from "commander";
import { skip } from "@argos-ci/core";
import ora from "ora";
import {
  buildNameOption,
  tokenOption,
  type BuildNameOption,
  type TokenOption,
} from "../options";

type SkipOptions = TokenOption & BuildNameOption;

export function skipCommand(program: Command) {
  program
    .command("skip")
    .description("Mark a build as skipped")
    .addOption(tokenOption)
    .addOption(buildNameOption)
    .action(async (options: SkipOptions) => {
      const spinner = ora("Creating skipped build").start();
      try {
        const result = await skip({
          token: options.token,
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
