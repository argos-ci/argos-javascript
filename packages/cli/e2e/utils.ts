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
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (result.status !== 0) {
    throw new CommandError(
      `Command failed: node ${cliPath} ${args.join(" ")}`,
      { status: result.status, stdout, stderr },
    );
  }

  return { stdout, stderr, combined: `${stdout}${stderr}` };
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
