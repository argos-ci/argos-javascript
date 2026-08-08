import { handleCliError, output } from "../../lib/run";
import {
  resolveAccountTarget,
  type AccountTarget,
  type AccountTargetOptions,
} from "../../lib/target";

export type AccountCommandOptions = AccountTargetOptions & {
  json?: boolean | undefined;
};

/**
 * Run an account-scoped command end to end: resolve the account target, run the
 * handler, print the result, and turn any failure into a clean CLI error.
 *
 * Every account endpoint acts as a user, so failures get the personal access
 * token hint.
 */
export async function runAccountAction<T>(opts: {
  options: AccountCommandOptions;
  handler: (target: AccountTarget) => Promise<T>;
  format: (data: T) => string;
}): Promise<void> {
  try {
    const target = await resolveAccountTarget(opts.options);
    const data = await opts.handler(target);
    output(data, opts.options, opts.format);
  } catch (error) {
    handleCliError(error, "user");
  }
}
