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
/** A test id taken from the seeded build's diffs, when one carries a test. */
let testId: string | null = null;

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
  testId =
    diffs.find((diff: { test?: { id: string } | null }) => diff.test)?.test
      .id ?? null;
});

describe("argos test get", () => {
  test("fails when no token is provided", () => {
    const error = expectRunToFail(["test", "get", "PROJECT-abc"]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("rejects an invalid --metrics-period value", () => {
    const error = expectRunToFail([
      "test",
      "get",
      "PROJECT-abc",
      "--token",
      projectToken,
      "--metrics-period",
      "5y",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("Allowed choices are 24h, 3d, 7d, 30d, 90d");
  });

  test("returns the test and its flakiness metrics in JSON mode", () => {
    if (!testId) {
      console.warn(
        `Build #${buildNumber} has no diff carrying a test; skipping.`,
      );
      return;
    }

    const result = JSON.parse(
      run(["test", "get", testId, "--token", projectToken, "--json"], baseEnv)
        .stdout,
    );
    expect(result.id).toBe(testId);
    expect(typeof result.name).toBe("string");
    expect(["ongoing", "removed"]).toContain(result.status);
    expect(typeof result.metrics.flakiness).toBe("number");
    expect(Array.isArray(result.series)).toBe(true);
  });

  test("prints human-readable test output", () => {
    if (!testId) {
      console.warn(
        `Build #${buildNumber} has no diff carrying a test; skipping.`,
      );
      return;
    }

    const output = run(
      ["test", "get", testId, "--token", projectToken],
      baseEnv,
    );
    expect(output.stdout).toContain(`Test ${testId}`);
    expect(output.stdout).toContain("Flakiness:");
  });
});

describe("argos test changes", () => {
  test("rejects an invalid --ignored value", () => {
    const error = expectRunToFail([
      "test",
      "changes",
      "PROJECT-abc",
      "--token",
      projectToken,
      "--ignored",
      "maybe",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("Allowed choices are true, false");
  });

  test("lists the test's changes in JSON mode", () => {
    if (!testId) {
      console.warn(
        `Build #${buildNumber} has no diff carrying a test; skipping.`,
      );
      return;
    }

    const changes = JSON.parse(
      run(
        ["test", "changes", testId, "--token", projectToken, "--json"],
        baseEnv,
      ).stdout,
    );
    expect(Array.isArray(changes)).toBe(true);
    for (const change of changes) {
      expect(typeof change.id).toBe("string");
      expect(typeof change.ignored).toBe("boolean");
      expect(typeof change.occurrences).toBe("number");
      expect(typeof change.firstSeen.buildNumber).toBe("number");
      expect(typeof change.lastSeen.buildNumber).toBe("number");
      expect(typeof change.diff.status).toBe("string");
    }
  });
});

describe("argos test comment", () => {
  test("fails when no project is provided", () => {
    const error = expectRunToFail([
      "test",
      "comment",
      "list",
      "PROJECT-abc",
      "--token",
      userAccessToken,
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("--project <owner/project> is required");
  });

  test("posts, edits and deletes a comment on a test", () => {
    if (!testId) {
      console.warn(
        `Build #${buildNumber} has no diff carrying a test; skipping.`,
      );
      return;
    }

    const withAuth = (args: string[]) => [
      ...args,
      "--token",
      userAccessToken,
      "--project",
      projectPath,
      "--json",
    ];

    const created = JSON.parse(
      run(
        withAuth([
          "test",
          "comment",
          "create",
          testId,
          "--body",
          "Posted by the CLI e2e suite.",
        ]),
        baseEnv,
      ).stdout,
    );
    expect(created.text).toContain("Posted by the CLI e2e suite.");

    const listed = JSON.parse(
      run(withAuth(["test", "comment", "list", testId]), baseEnv).stdout,
    );
    expect(
      listed.some((comment: { id: string }) => comment.id === created.id),
    ).toBe(true);

    const edited = JSON.parse(
      run(
        withAuth([
          "test",
          "comment",
          "edit",
          testId,
          created.id,
          "--body",
          "Edited by the CLI e2e suite.",
        ]),
        baseEnv,
      ).stdout,
    );
    expect(edited.text).toContain("Edited by the CLI e2e suite.");

    // Leave the test clean: the suite runs against a shared project.
    run(withAuth(["test", "comment", "delete", testId, created.id]), baseEnv);
  });
});
