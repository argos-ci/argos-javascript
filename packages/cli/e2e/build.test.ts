import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const buildNumber = process.env.ARGOS_BUILD_NUMBER || "27748";

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: mkdtempSync(join(tmpdir(), "argos-cli-e2e-")),
  ARGOS_API_BASE_URL: process.env.ARGOS_API_BASE_URL,
  ARGOS_TOKEN: getRequiredEnv("ARGOS_TOKEN"),
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

let build: any;
let buildUrl: string;

beforeAll(() => {
  build = JSON.parse(
    run(["build", "get", buildNumber, "--json"], baseEnv).stdout,
  );
  buildUrl = build.url;
});

describe("argos build get", () => {
  test("fails when token is missing for a build number", () => {
    const error = expectRunToFail(["build", "get", "1"], { ARGOS_TOKEN: "" });

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("fails when token is missing for a build URL", () => {
    const error = expectRunToFail(
      [
        "build",
        "get",
        "https://app.argos-ci.com/argos-ci/argos-javascript/builds/1",
      ],
      { ARGOS_TOKEN: "" },
    );

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("fails for an unknown build number", () => {
    const error = expectRunToFail(["build", "get", "999999"]);

    expect(error.status).not.toBe(0);
    expect(error.stderr).toMatch("Unauthorized");
  });

  test("fails for an invalid build reference", () => {
    const error = expectRunToFail(["build", "get", "not-a-number"]);

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("valid build number or Argos build URL");
  });

  test("returns build details for a build number in JSON mode", () => {
    expect(build.id).toBeDefined();
    expect(build.url).toBeDefined();
    expect(build.number).toBe(Number(buildNumber));
  });

  test("returns build details for a build number in human-readable mode", () => {
    const buildByNumberHumanOutput = run(["build", "get", buildNumber], {
      ...baseEnv,
    });

    expect(buildByNumberHumanOutput.stdout).toContain(`Build #${buildNumber}`);
    expect(buildByNumberHumanOutput.stdout).toContain(
      `Status: ${build.status}`,
    );
    expect(buildByNumberHumanOutput.stdout).toContain("Snapshots:");
    expect(buildByNumberHumanOutput.stdout).toContain(`URL: ${buildUrl}`);
  });

  test("accepts an Argos build URL", () => {
    const buildByUrlJsonOutput = run(
      ["build", "get", "--json", buildUrl],
      baseEnv,
    );
    const buildByUrlJson = JSON.parse(buildByUrlJsonOutput.stdout);

    expect(buildByUrlJson.id).toBe(build.id);
    expect(buildByUrlJson.number).toBe(Number(buildNumber));
  });
});

describe("argos build snapshots", () => {
  test("fails when token is missing", () => {
    const error = expectRunToFail(["build", "snapshots", "1"], {
      ARGOS_TOKEN: "",
    });

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("prints human-readable snapshot data", () => {
    const buildSnapshots = run(["build", "snapshots", buildNumber], {
      ...baseEnv,
    });

    expect(buildSnapshots.stdout).toContain("Snapshots for build #");
    expect(buildSnapshots.stdout).toContain("Summary:");
  });

  test("returns structured snapshot data in JSON mode", () => {
    const buildSnapshotsJsonOutput = run(
      ["build", "snapshots", buildNumber, "--json"],
      baseEnv,
    );
    const buildSnapshotsJson = JSON.parse(buildSnapshotsJsonOutput.stdout);

    expect(Array.isArray(buildSnapshotsJson)).toBe(true);
    expect(buildSnapshotsJson[0]?.id).toBeTruthy();
  });

  test("accepts an Argos build URL", () => {
    const buildSnapshotsJsonOutput = run(
      ["build", "snapshots", buildUrl, "--json"],
      baseEnv,
    );
    const buildSnapshotsJson = JSON.parse(buildSnapshotsJsonOutput.stdout);
    expect(Array.isArray(buildSnapshotsJson)).toBe(true);
  });

  test("supports filtering snapshots needing review", () => {
    const snapshotsNeedsReviewJsonOutput = run(
      ["build", "snapshots", buildNumber, "--needs-review", "--json"],
      baseEnv,
    );
    const snapshotsNeedingReview = JSON.parse(
      snapshotsNeedsReviewJsonOutput.stdout,
    );

    expect(Array.isArray(snapshotsNeedingReview)).toBe(true);
  });

  test("accepts --metrics-period and enriches diffs with flakiness data", () => {
    const output = run(
      ["build", "snapshots", buildNumber, "--metrics-period", "30d", "--json"],
      baseEnv,
    );
    const diffs = JSON.parse(output.stdout);
    expect(Array.isArray(diffs)).toBe(true);
    // `test` and `change` are always present on a diff (both nullable). `every`
    // holds trivially for an empty build, so the assertion stays unconditional.
    expect(
      diffs.every((diff: object) => "test" in diff && "change" in diff),
    ).toBe(true);
  });

  test("rejects an invalid --metrics-period value", () => {
    const error = expectRunToFail([
      "build",
      "snapshots",
      buildNumber,
      "--metrics-period",
      "5y",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("Allowed choices are 24h, 3d, 7d, 30d, 90d");
  });
});

/** A fresh directory path to download into, not created yet. */
function downloadDirectory(): string {
  return join(mkdtempSync(join(tmpdir(), "argos-cli-e2e-download-")), "out");
}

describe("argos build list", () => {
  test("fails when token is missing", () => {
    const error = expectRunToFail(["build", "list"], { ARGOS_TOKEN: "" });

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("lists the most recent builds first, up to --limit", () => {
    const builds = JSON.parse(
      run(["build", "list", "--limit", "3", "--json"], baseEnv).stdout,
    );
    const numbers = builds.map((build: { number: number }) => build.number);

    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers.length).toBeLessThanOrEqual(3);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  test("filters builds by branch", () => {
    const builds = JSON.parse(
      run(
        ["build", "list", "--branch", "main", "--limit", "5", "--json"],
        baseEnv,
      ).stdout,
    );

    expect(builds.length).toBeGreaterThan(0);
    expect(
      builds.every(
        (build: { head: { branch: string } }) => build.head.branch === "main",
      ),
    ).toBe(true);
  });

  test("prints human-readable build data", () => {
    const { stdout } = run(["build", "list", "--limit", "1"], baseEnv);

    expect(stdout).toContain("Builds (1)");
    expect(stdout).toContain("URL: ");
  });
});

describe("argos build download", () => {
  test("downloads the screenshots of a build, laid out by name", () => {
    // The `upload` e2e test uploads `__fixtures__` on every run, main included.
    const builds = JSON.parse(
      run(
        [
          "build",
          "list",
          "--branch",
          "main",
          "--search",
          "argos-cli-e2e-node",
          "--limit",
          "10",
          "--json",
        ],
        baseEnv,
      ).stdout,
    );
    const source = builds.find(
      (build: { status: string }) =>
        build.status !== "pending" && build.status !== "progress",
    );
    const directory = downloadDirectory();
    const download = JSON.parse(
      run(
        [
          "build",
          "download",
          String(source.number),
          "--output",
          directory,
          "--json",
        ],
        baseEnv,
      ).stdout,
    );

    expect(download.build.number).toBe(source.number);
    expect(download.files.length).toBeGreaterThan(0);
    for (const file of download.files) {
      expect(statSync(file.path).size).toBeGreaterThan(0);
    }
    expect(download.files.map((file: { path: string }) => file.path)).toContain(
      join(directory, "screenshots", "penelope.png"),
    );
  });

  test("refuses a directory that is not empty", () => {
    const directory = downloadDirectory();
    mkdirSync(directory);
    writeFileSync(join(directory, "keep.txt"), "");

    const error = expectRunToFail([
      "build",
      "download",
      buildNumber,
      "--output",
      directory,
    ]);

    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(`${directory} is not empty`);
    expect(existsSync(join(directory, "keep.txt"))).toBe(true);
  });
});
