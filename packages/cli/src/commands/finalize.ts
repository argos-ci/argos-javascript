import ora from "ora";
import type { Command } from "commander";
import { finalize } from "@argos-ci/core";
import { parallelNonce } from "../options";

export function finalizeCommand(program: Command) {
  program
    .command("finalize")
    .description("Finalize pending parallel builds")
    .addOption(parallelNonce)
    .action(async (options) => {
      const spinner = ora("Finalizing builds").start();
      try {
        const result = await finalize({
          parallel: {
            nonce: options.parallelNonce,
          },
        });
        spinner.succeed(
          result.builds.length === 0
            ? "No builds to finalize"
            : `Builds finalized: ${result.builds.map((b) => b.url).join(", ")}`,
        );
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`Failed to finalize: ${error.message}`);
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
