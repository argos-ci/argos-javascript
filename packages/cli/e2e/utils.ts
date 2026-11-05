import { spawnSync } from "node:child_process";

const cliPath = "bin/argos-cli.js";

export type RunResult = {
  stdout: string;
  stderr: string;
  combined: string;
};

/** Error thrown by {@link run} when the CLI exits with a non-zero status. */
export class CommandError extends Error {
  status: number | null;
  stdout: string;
  stderr: string;

  constructor(
    message: string,
    options: { status: number | null; stdout: string; stderr: string },
  ) {
    super(message);
    this.name = "CommandError";
    this.status = options.status;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}

/** Run the built CLI with the given args, throwing {@link CommandError} on failure. */
export function run(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): RunResult {
  const result = spawnSync("node", [cliPath, ...args], {
    encoding: "utf8",
    env,
    // The default 1 MB buffer kills the child once its output outgrows it
    // (status: null). The e2e suite approves the shared build on every run,
    // so `review list` output grows unboundedly and eventually crossed it.
    maxBuffer: 128 * 1024 * 1024,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (result.status !== 0) {
    // Vitest's failure summary only shows the error message, so the CLI's
    // output goes in the message itself. Only the end of each stream is kept:
    // that is where the CLI prints its error, and `--json` output can be large.
    const outcome = result.signal
      ? `killed by ${result.signal}`
      : `exit status ${result.status}`;
    const errorTail = tail(stderr, 4000);
    const outputTail = tail(stdout, 1000);
    const message = [
      `Command failed (${outcome}): node ${cliPath} ${args.join(" ")}`,
      result.error && `spawn error: ${result.error.message}`,
      errorTail && `stderr:\n${errorTail}`,
      outputTail && `stdout:\n${outputTail}`,
    ]
      .filter(Boolean)
      .join("\n");

    throw new CommandError(message, { status: result.status, stdout, stderr });
  }

  return { stdout, stderr, combined: `${stdout}${stderr}` };
}

/** The last `maxLength` characters of `output`, indented; "" if blank. */
function tail(output: string, maxLength: number): string {
  let text = output.trim();
  if (text.length > maxLength) {
    const omitted = text.length - maxLength;
    text = `[${omitted} earlier characters omitted]\n${text.slice(-maxLength)}`;
  }
  return text.replace(/^(?=.)/gm, "  ");
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
