import ora from 'ora';
import { Option, type Command } from 'commander';
import { finalize } from '@argos-ci/core';
import {
    buildNameOption,
    parallelNonceOption,
    tokenOption,
    type BuildNameOption,
    type ParallelNonceOption,
    type TokenOption,
} from '../options';

type FinalizeOptions = ParallelNonceOption &
    TokenOption &
    BuildNameOption & { skipIfEmpty?: boolean | undefined };

const skipIfEmptyOption = new Option(
    '--skip-if-empty',
    'Create a skipped build when no parallel build matches the nonce.\nUseful when uploads are conditional (e.g. skipped by a CI cache) and Argos is a required status check: the skipped build reports a success status even though nothing was uploaded.'
);

export function finalizeCommand(program: Command) {
    program
        .command('finalize')
        .description('Finalize pending parallel builds')
        .addOption(parallelNonceOption)
        .addOption(tokenOption)
        .addOption(skipIfEmptyOption)
        .addOption(buildNameOption)
        .action(async (options: FinalizeOptions) => {
            const spinner = ora('Finalizing builds').start();
            try {
                const result = await finalize({
                    token: options.token,
                    parallel: options.parallelNonce ? { nonce: options.parallelNonce } : undefined,
                    skipIfEmpty: options.skipIfEmpty,
                    buildName: options.buildName,
                });
                spinner.succeed(
                    result.skippedBuild
                        ? `No builds to finalize — skipped build created: ${result.skippedBuild.url}`
                        : result.builds.length === 0
                          ? 'No builds to finalize'
                          : `Builds finalized: ${result.builds.map((b) => b.url).join(', ')}`
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
