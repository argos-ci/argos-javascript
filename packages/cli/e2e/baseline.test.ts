import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const projectToken = getRequiredEnv("ARGOS_TOKEN");
const userAccessToken = getRequiredEnv("USER_ACCESS_TOKEN");

// The `upload` e2e test uploads a build under this name on every run, main
// included, so main always has a baseline for it.
const buildName = `argos-cli-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`;

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: mkdtempSync(join(tmpdir(), "argos-cli-e2e-")),
  ARGOS_API_BASE_URL: process.env.ARGOS_API_BASE_URL,
  ARGOS_TOKEN: projectToken,
};

function expectRunToFail(
  args: string[],
  overrideEnv?: NodeJS.ProcessEnv,
): CommandError {
  try {
    run(args, { ...baseEnv, ...overrideEnv });
  } catch (error) {
    return error as CommandError;
  }

  throw new Error(
    `Expected command to fail: node bin/argos-cli.js ${args.join(" ")}`,
  );
}

/** A fresh directory path to download into, not created yet. */
function downloadDirectory(): string {
  return join(mkdtempSync(join(tmpdir(), "argos-cli-e2e-baseline-")), "out");
}

describe("argos baseline download", () => {
  test("downloads the latest baseline of the default branch", () => {
    const directory = downloadDirectory();
    const download = JSON.parse(
      run(
        [
          "baseline",
          "download",
          "--build-name",
          buildName,
          "--output",
          directory,
          "--json",
        ],
        baseEnv,
      ).stdout,
    );

    expect(download.build.head.branch).toBe("main");
    expect(download.files.length).toBeGreaterThan(0);
    for (const file of download.files) {
      expect(statSync(file.path).size).toBeGreaterThan(0);
    }
    expect(download.files.map((file: { path: string }) => file.path)).toContain(
      join(directory, "screenshots", "penelope.png"),
    );
  });

  test("prints which build the baseline comes from", () => {
    const { stdout } = run(
      [
        "baseline",
        "download",
        "--build-name",
        buildName,
        "--output",
        downloadDirectory(),
      ],
      baseEnv,
    );

    expect(stdout).toMatch(/Downloaded \d+ baseline snapshots of build #\d+/);
    expect(stdout).toContain("Branch: main");
  });

  test("fails when the branch has no baseline", () => {
    const error = expectRunToFail([
      "baseline",
      "download",
      "--branch",
      "argos-cli-e2e-no-such-branch",
      "--output",
      downloadDirectory(),
    ]);

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(
      'No baseline found on branch "argos-cli-e2e-no-such-branch" for build name "default" (ci mode).',
    );
  });

  test("fails when token is missing", () => {
    const error = expectRunToFail(
      ["baseline", "download", "--output", downloadDirectory()],
      { ARGOS_TOKEN: "" },
    );

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(
      "No Argos token found. Pass the project's token with --token or set ARGOS_TOKEN.",
    );
  });

  test("explains that a personal access token cannot find the baseline", () => {
    const error = expectRunToFail(
      ["baseline", "download", "--output", downloadDirectory()],
      { ARGOS_TOKEN: userAccessToken },
    );

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("requires a project token");
    expect(error.stderr).toContain(
      "Finding the baseline takes the project's token",
    );
  });

  test("refuses a directory that is not empty", () => {
    const directory = downloadDirectory();
    mkdirSync(directory);
    writeFileSync(join(directory, "keep.txt"), "");

    const error = expectRunToFail([
      "baseline",
      "download",
      "--output",
      directory,
    ]);

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(`${directory} is not empty`);
    expect(existsSync(join(directory, "keep.txt"))).toBe(true);
  });
});
