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

let account: string;

beforeAll(() => {
  // Derive the account slug from the seeded build's URL, so the analytics
  // account always matches the account the tokens belong to.
  const build = JSON.parse(
    run(["build", "get", buildNumber, "--json"], {
      ...baseEnv,
      ARGOS_TOKEN: projectToken,
    }).stdout,
  );
  const match = build.url.match(
    /app\.argos-ci\.(?:com|dev(?::\d+)?)\/([^/?#]+)\//,
  );
  if (!match) {
    throw new Error(`Could not parse account from build URL: ${build.url}`);
  }
  account = match[1];
});

describe("argos analytics", () => {
  test("fails when no token is provided", () => {
    const error = expectRunToFail(["analytics", "--account", account]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("No Argos token found");
  });

  test("fails when no account is provided", () => {
    const error = expectRunToFail(["analytics", "--token", userAccessToken]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("An account is required");
  });

  test("rejects an invalid --group-by value", () => {
    const error = expectRunToFail([
      "analytics",
      "--account",
      account,
      "--token",
      userAccessToken,
      "--group-by",
      "year",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain("Allowed choices are day, week, month");
  });

  test("rejects an invalid --from date", () => {
    const error = expectRunToFail([
      "analytics",
      "--account",
      account,
      "--token",
      userAccessToken,
      "--from",
      "not-a-date",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain('Invalid --from value: "not-a-date"');
  });

  test("returns account analytics in JSON mode", () => {
    const output = run(
      ["analytics", "--account", account, "--token", userAccessToken, "--json"],
      baseEnv,
    );
    const analytics = JSON.parse(output.stdout);

    expect(typeof analytics.screenshots.all.total).toBe("number");
    expect(Array.isArray(analytics.screenshots.series)).toBe(true);
    expect(Array.isArray(analytics.screenshots.projects)).toBe(true);

    expect(typeof analytics.builds.all.total).toBe("number");
    expect(typeof analytics.builds.all.changesDetected).toBe("number");
    expect(Array.isArray(analytics.builds.series)).toBe(true);
    expect(Array.isArray(analytics.builds.projects)).toBe(true);
  });

  test("prints human-readable analytics", () => {
    const output = run(
      ["analytics", "--account", account, "--token", userAccessToken],
      baseEnv,
    );
    expect(output.stdout).toContain(`Analytics for ${account}`);
    expect(output.stdout).toContain("Builds:");
    expect(output.stdout).toContain("Screenshots:");
  });

  test("accepts a bounded date range and --group-by", () => {
    // The API caps the range at 365 days, so use a fixed sub-year window.
    const output = run(
      [
        "analytics",
        "--account",
        account,
        "--token",
        userAccessToken,
        "--from",
        "2024-01-01",
        "--to",
        "2024-06-01",
        "--group-by",
        "week",
        "--json",
      ],
      baseEnv,
    );
    const analytics = JSON.parse(output.stdout);
    expect(typeof analytics.builds.all.total).toBe("number");
  });

  test("rejects a --time-zone the runtime does not know", () => {
    const error = expectRunToFail([
      "analytics",
      "--account",
      account,
      "--token",
      userAccessToken,
      "--time-zone",
      "Mars/Olympus",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain(
      'Unknown time zone "Mars/Olympus". Use an IANA name such as Europe/Paris.',
    );
  });

  test("rejects a numeric offset as --time-zone", () => {
    // Intl accepts "+02:00", so the API is the one rejecting it: Postgres
    // would read it as UTC-2.
    const error = expectRunToFail([
      "analytics",
      "--account",
      account,
      "--token",
      userAccessToken,
      "--time-zone",
      "+02:00",
    ]);
    expect(error.status).not.toBe(0);
    expect(error.stderr).toContain('Unknown time zone "+02:00"');
  });

  test("starts each day at midnight in --time-zone", () => {
    // Paris moves to summer time on 2024-03-31, so the two days start at
    // different UTC hours.
    const output = run(
      [
        "analytics",
        "--account",
        account,
        "--token",
        userAccessToken,
        "--from",
        "2024-03-31",
        "--to",
        "2024-04-01",
        "--time-zone",
        "Europe/Paris",
        "--json",
      ],
      baseEnv,
    );
    const analytics = JSON.parse(output.stdout);
    const days = ["2024-03-30T23:00:00.000Z", "2024-03-31T22:00:00.000Z"];
    for (const { series } of [analytics.builds, analytics.screenshots]) {
      expect(
        series.map((point: { ts: number }) => new Date(point.ts).toISOString()),
      ).toEqual(days);
    }
  });

  test("prints the period in --time-zone", () => {
    const output = run(
      [
        "analytics",
        "--account",
        account,
        "--token",
        userAccessToken,
        "--from",
        "2024-03-31",
        "--to",
        "2024-04-01",
        "--time-zone",
        "Europe/Paris",
      ],
      baseEnv,
    );
    expect(output.stdout).toContain(
      "Period: 2024-03-31T00:00:00+01:00 → 2024-04-01T23:59:59+02:00 (grouped by day in Europe/Paris)",
    );
  });
});
