import { spawnSync } from "node:child_process";

const cliPath = "bin/argos-cli.js";

export function run(args, env = process.env) {
  const result = spawnSync("node", [cliPath, ...args], {
    encoding: "utf8",
    env,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (result.status !== 0) {
    const error = new Error(
      `Command failed: node ${cliPath} ${args.join(" ")}`,
    );
    error.status = result.status;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }

  return {
    stdout,
    stderr,
    combined: `${stdout}${stderr}`,
  };
}

export function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
