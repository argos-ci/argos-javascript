import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const userAccessToken = getRequiredEnv("USER_ACCESS_TOKEN");
const projectToken = getRequiredEnv("ARGOS_TOKEN");
const buildNumber = process.env.ARGOS_BUILD_NUMBER || "27748";

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: mkdtempSync(join(tmpdir(), "argos-cli-e2e-")),
  ARGOS_API_BASE_URL: process.env.ARGOS_API_BASE_URL,
  ARGOS_TOKEN: "",
  ARGOS_PROJECT: "",
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

let projectPath: string;
// The change id of a diff in the seeded build, when it has one. Used to
// exercise the ignore/unignore round trip against the real API.
let changeId: string | null = null;

beforeAll(() => {
  const build = JSON.parse(
    run(["build", "get", buildNumber, "--json"], {
      ...baseEnv,
      ARGOS_TOKEN: projectToken,
    }).stdout,
  );
  const match = build.url.match(
    /app\.argos-ci\.(?:com|dev(?::\d+)?)\/([^/?#]+)\/([^/?#]+)\/builds\//,
  );
  if (!match) {
    throw new Error(`Could not parse project from build URL: ${build.url}`);
  }
  projectPath = `${match[1]}/${match[2]}`;

  const diffs = JSON.parse(
    run(["build", "snapshots", buildNumber, "--json"], {
      ...baseEnv,
      ARGOS_TOKEN: projectToken,
    }).stdout,
  );
  changeId =
    diffs.find((diff: { change?: { id: string } | null }) => diff.change)
      ?.change.id ?? null;
});

describe("argos change ignore", () => {
  test("fails when no token is provided", () => {
    const error = expectRunToFail([
      "change",
      "ignore",
      "PROJECT-abc-xyz",
      "--project",
      "acme/web",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("fails when no project is provided", () => {
    const error = expectRunToFail([
      "change",
      "ignore",
      "PROJECT-abc-xyz",
      "--token",
      userAccessToken,
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("--project <owner/project> is required");
  });

  test("rejects an invalid --metrics-period value", () => {
    const error = expectRunToFail([
      "change",
      "ignore",
      "PROJECT-abc-xyz",
      "--token",
      userAccessToken,
      "--project",
      projectPath,
      "--metrics-period",
      "5y",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("Allowed choices are 24h, 3d, 7d, 30d, 90d");
  });

  test("fails for an unknown change", () => {
    const error = expectRunToFail([
      "change",
      "ignore",
      "not-a-real-change",
      "--token",
      userAccessToken,
      "--project",
      projectPath,
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toMatch(/not found/i);
  });
});

describe("argos change ignore / unignore", () => {
  test("ignores then unignores a change in JSON mode", () => {
    if (!changeId) {
      console.warn(
        `Build #${buildNumber} has no change to ignore; skipping the round trip.`,
      );
      return;
    }

    const ignored = JSON.parse(
      run(
        [
          "change",
          "ignore",
          changeId,
          "--token",
          userAccessToken,
          "--project",
          projectPath,
          "--json",
        ],
        baseEnv,
      ).stdout,
    );
    expect(ignored.id).toBe(changeId);
    expect(ignored.ignored).toBe(true);
    expect(typeof ignored.occurrences).toBe("number");

    const unignored = JSON.parse(
      run(
        [
          "change",
          "unignore",
          changeId,
          "--token",
          userAccessToken,
          "--project",
          projectPath,
          "--json",
        ],
        baseEnv,
      ).stdout,
    );
    expect(unignored.id).toBe(changeId);
    expect(unignored.ignored).toBe(false);
  });

  test("prints human-readable change output", () => {
    if (!changeId) {
      console.warn(
        `Build #${buildNumber} has no change to ignore; skipping the round trip.`,
      );
      return;
    }

    const output = run(
      [
        "change",
        "unignore",
        changeId,
        "--token",
        userAccessToken,
        "--project",
        projectPath,
      ],
      baseEnv,
    );
    expect(output.stdout).toContain(`Change ${changeId}`);
    expect(output.stdout).toContain("Ignored: no");
  });
});
