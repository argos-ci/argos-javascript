import ora from "ora";
import type { Command } from "commander";
import { finalize } from "@argos-ci/core";
import { parallelNonceOption, type ParallelNonceOption } from "../options";

type FinalizeOptions = ParallelNonceOption;

export function finalizeCommand(program: Command) {
  program
    .command("finalize")
    .description("Finalize pending parallel builds")
    .addOption(parallelNonceOption)
    .action(async (options: FinalizeOptions) => {
      const spinner = ora("Finalizing builds").start();
      try {
        const result = await finalize({
          parallel: options.parallelNonce
            ? { nonce: options.parallelNonce }
            : undefined,
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
