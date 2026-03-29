/**
 * E2E tests for `argos builds` commands.
 * Requires ARGOS_TOKEN env var.
 * Optional: ARGOS_API_BASE_URL env var.
 *
 * Usage:
 *   ARGOS_TOKEN=xxx node e2e/builds.js
 *   ARGOS_TOKEN=xxx ARGOS_API_BASE_URL=https://api.argos-ci.dev:4001/v2 NODE_OPTIONS=--use-system-ca pnpm -C packages/cli exec node e2e/builds.js
 */

import { assert, run } from "./utils.js";

const token = process.env.ARGOS_TOKEN;
const apiBaseURL = process.env.ARGOS_API_BASE_URL;
const buildNumber = process.env.ARGOS_BUILD_NUMBER || "28022";

if (!token) {
  console.error(
    "Usage: ARGOS_TOKEN=xxx [ARGOS_API_BASE_URL=<url>] node e2e/builds.js",
  );
  process.exit(1);
}

function envWith(overrides = {}) {
  return { ...process.env, ...overrides };
}

const baseEnv = apiBaseURL
  ? envWith({ ARGOS_API_BASE_URL: apiBaseURL })
  : process.env;

console.log("\n`builds get` failing commands:");

try {
  run(["builds", "get", "1"], { ...baseEnv, ARGOS_TOKEN: "" });
  assert(false, "Missing token with build number should exit with code 1");
} catch (err) {
  assert(err.status !== 0, "Exit code 1 when no token for build number");
  assert(
    err.stderr.includes("No Argos token found"),
    "Error message includes 'No Argos token found' for build number",
  );
}

try {
  run(
    [
      "builds",
      "get",
      "https://app.argos-ci.com/argos-ci/argos-javascript/builds/1",
    ],
    { ...baseEnv, ARGOS_TOKEN: "" },
  );
  assert(false, "Missing token with build URL should exit with code 1");
} catch (err) {
  assert(err.status !== 0, "Exit code 1 when no token for build URL");
  assert(
    err.stderr.includes("No Argos token found"),
    "Error message includes 'No Argos token found' for build URL",
  );
}

try {
  run(["builds", "get", "999999"], {
    ...baseEnv,
    ARGOS_TOKEN: token,
  });
  assert(false, "Unknown build number should exit with code 1");
} catch (err) {
  assert(err.status !== 0, "Unknown build number: exit code 1");
  assert(
    err.stderr.includes("Error:"),
    "Unknown build number: human-readable error message",
  );
}

try {
  run(["builds", "get", "not-a-number"], {
    ...baseEnv,
    ARGOS_TOKEN: token,
  });
  assert(false, "Invalid build number should exit with code 1");
} catch (err) {
  assert(err.status !== 0, "Invalid build number: exit code 1");
  assert(
    err.stderr.includes("valid build number or Argos build URL"),
    "Invalid build reference: human-readable error message",
  );
}

console.log("\n`builds get` successful commands:");
const buildByNumberJsonOutput = run(["builds", "get", buildNumber, "--json"], {
  ...baseEnv,
  ARGOS_TOKEN: token,
});
const buildByNumberJson = JSON.parse(buildByNumberJsonOutput.stdout);
const buildUrl = buildByNumberJson.url;

const buildByNumberHumanOutput = run(["builds", "get", buildNumber], {
  ...baseEnv,
  ARGOS_TOKEN: token,
});
assert(
  buildByNumberHumanOutput.stdout.includes(`Build #${buildNumber}`),
  "Prints the build number in human-readable mode",
);
assert(
  buildByNumberHumanOutput.stdout.includes("Snapshots:"),
  "Prints snapshot stats in human-readable mode",
);
assert(
  buildByNumberHumanOutput.stdout.includes(`URL: ${buildUrl}`),
  "Prints the build URL in human-readable mode",
);
assert(buildByNumberJson.id !== undefined, "Returns build id");
assert(buildByNumberJson.url !== undefined, "Returns build url");
assert(
  buildByNumberJson.number === Number(buildNumber),
  "Returns the requested build number",
);

const buildByUrlJsonOutput = run(["builds", "get", "--json", buildUrl], {
  ...baseEnv,
  ARGOS_TOKEN: token,
});
const buildByUrlJson = JSON.parse(buildByUrlJsonOutput.stdout);
assert(
  buildByUrlJson.number === Number(buildNumber),
  "accepts an Argos build URL",
);

console.log("\n`builds snapshots` failing commands:");

try {
  run(["builds", "snapshots", "1"], { ...baseEnv, ARGOS_TOKEN: "" });
  assert(
    false,
    "Missing token for snapshots with build number should exit with code 1",
  );
} catch (err) {
  assert(
    err.status !== 0,
    "Exit code 1 when no token for snapshots with build number",
  );
  assert(
    err.stderr.includes("No Argos token found"),
    "Error message includes 'No Argos token found' for snapshots with build number",
  );
}

console.log("\n`builds snapshots` successful commands:");
const buildSnapshots = run(["builds", "snapshots", buildNumber], {
  ...baseEnv,
  ARGOS_TOKEN: token,
});
assert(
  buildSnapshots.stdout.includes("Snapshots for build #"),
  "Prints the build id",
);
assert(buildSnapshots.stdout.includes("Summary:"), "Prints the build Summary");

const buildSnapshotsJsonOutput = run(
  ["builds", "snapshots", buildNumber, "--json"],
  {
    ...baseEnv,
    ARGOS_TOKEN: token,
  },
);
const buildSnapshotsJson = JSON.parse(buildSnapshotsJsonOutput.stdout);
assert(Array.isArray(buildSnapshotsJson), "Returns an array in JSON mode");
assert(
  Boolean(buildSnapshotsJson[0].base.id),
  "Returns structured snapshot data",
);

const snapshotsNeedsReviewJsonOutput = run(
  ["builds", "snapshots", buildNumber, "--needs-review", "--json"],
  {
    ...baseEnv,
    ARGOS_TOKEN: token,
  },
);
const snapshotsNeedingReview = JSON.parse(
  snapshotsNeedsReviewJsonOutput.stdout,
);
assert(Array.isArray(snapshotsNeedingReview), "Returns an array in JSON mode");
assert(
  snapshotsNeedingReview.length === 0,
  "Returns an empty array when there are no snapshots to review",
);
