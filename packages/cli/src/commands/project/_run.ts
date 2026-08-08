import { handleCliError, output } from "../../lib/run";
import {
  resolveProjectTarget,
  type AuthMode,
  type ProjectTarget,
  type TargetOptions,
} from "../../lib/target";

export type ProjectCommandOptions = TargetOptions & {
  json?: boolean | undefined;
};

/**
 * Run a project-scoped command end to end: resolve the project target, run the
 * handler, print the result, and turn any failure into a clean CLI error.
 *
 * `auth` follows {@link resolveProjectTarget}: `project` lets a project token
 * fall back to its own project, `user` requires an explicit project path.
 */
export async function runProjectAction<T>(opts: {
  options: ProjectCommandOptions;
  auth: AuthMode;
  handler: (target: ProjectTarget) => Promise<T>;
  format: (data: T) => string;
}): Promise<void> {
  try {
    const target = await resolveProjectTarget(opts.options, {
      auth: opts.auth,
    });
    const data = await opts.handler(target);
    output(data, opts.options, opts.format);
  } catch (error) {
    handleCliError(error, opts.auth);
  }
}
