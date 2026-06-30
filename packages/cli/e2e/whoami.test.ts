import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const userAccessToken = getRequiredEnv("USER_ACCESS_TOKEN");

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: mkdtempSync(join(tmpdir(), "argos-cli-e2e-")),
  ARGOS_API_BASE_URL: process.env.ARGOS_API_BASE_URL,
  ARGOS_TOKEN: "",
};

describe("argos whoami", () => {
  test("fails when no token is provided", () => {
    let error: CommandError | undefined;
    try {
      run(["whoami"], baseEnv);
    } catch (err) {
      error = err as CommandError;
    }
    expect(error).toBeDefined();
    expect(error?.status).not.toBe(0);
    expect(error?.stderr).toContain("No Argos token found");
  });

  test("prints the authenticated user in JSON mode", () => {
    const output = run(
      ["whoami", "--token", userAccessToken, "--json"],
      baseEnv,
    );
    const user = JSON.parse(output.stdout);
    expect(user.id).toBeDefined();
    expect(user.slug).toBeDefined();
  });

  test("prints human-readable user data", () => {
    const output = run(["whoami", "--token", userAccessToken], baseEnv);
    expect(output.stdout).toContain("Logged in to Argos as");
    expect(output.stdout).toContain("Slug:");
  });
});
