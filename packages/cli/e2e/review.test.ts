import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const userAccessToken = getRequiredEnv("USER_ACCESS_TOKEN");
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

let buildUrl: string;
let projectPath: string;

beforeAll(() => {
  const build = JSON.parse(
    run(["build", "get", buildNumber, "--json"], baseEnv).stdout,
  );
  buildUrl = build.url;
  const match = buildUrl.match(
    /app\.argos-ci\.(?:com|dev(?::\d+)?)\/([^/?#]+)\/([^/?#]+)\/builds\//,
  );
  if (!match) {
    throw new Error(`Could not parse project from build URL: ${buildUrl}`);
  }
  projectPath = `${match[1]}/${match[2]}`;
});

describe("argos review create", () => {
  test("fails when event is missing", () => {
    const error = expectRunToFail(["review", "create", buildNumber]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("required option '--event <event>'");
  });

  test("fails when event is invalid", () => {
    const error = expectRunToFail([
      "review",
      "create",
      buildNumber,
      "--event",
      "maybe",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("'--event <event>' argument 'maybe'");
  });

  test("fails when build number used without --project", () => {
    const error = expectRunToFail([
      "review",
      "create",
      buildNumber,
      "--event",
      "approve",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(
      "--project <owner/project> is required for build-number references",
    );
  });

  test("fails when no token is provided", () => {
    const noTokenHome = mkdtempSync(join(tmpdir(), "argos-cli-e2e-no-token-"));
    const error = expectRunToFail(
      ["review", "create", buildUrl, "--event", "approve"],
      { ARGOS_TOKEN: "", HOME: noTokenHome },
    );
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("creates an approved review in JSON mode", () => {
    const output = run(
      [
        "review",
        "create",
        buildNumber,
        "--project",
        projectPath,
        "--token",
        userAccessToken,
        "--event",
        "approve",
        "--json",
      ],
      baseEnv,
    );
    const review = JSON.parse(output.stdout);
    expect(review.id).toBeDefined();
    expect(review.state).toBe("approved");
  });

  test("prints human-readable review data", () => {
    const output = run(
      [
        "review",
        "create",
        buildNumber,
        "--project",
        projectPath,
        "--token",
        userAccessToken,
        "--event",
        "approve",
      ],
      baseEnv,
    );
    expect(output.stdout).toContain("Review #");
    expect(output.stdout).toContain("State: approved");
  });

  test("accepts an Argos build URL and a Markdown body", () => {
    const output = run(
      [
        "review",
        "create",
        buildUrl,
        "--token",
        userAccessToken,
        "--event",
        "approve",
        "--body",
        "Approved via CLI e2e.",
        "--json",
      ],
      baseEnv,
    );
    const review = JSON.parse(output.stdout);
    expect(review.id).toBeDefined();
    expect(review.state).toBe("approved");
  });
});

describe("argos review list", () => {
  test("lists reviews in JSON mode", () => {
    const output = run(
      [
        "review",
        "list",
        buildNumber,
        "--project",
        projectPath,
        "--token",
        userAccessToken,
        "--json",
      ],
      baseEnv,
    );
    const reviews = JSON.parse(output.stdout);
    expect(Array.isArray(reviews)).toBe(true);
  });

  test("accepts an Argos build URL", () => {
    const output = run(
      ["review", "list", buildUrl, "--token", userAccessToken],
      baseEnv,
    );
    expect(output.stdout).toMatch(/Reviews|No reviews found/);
  });
});
