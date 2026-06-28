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

/** Run a comment command authenticated with the user access token. */
function runAs(args: string[]) {
  return run([...args, "--token", userAccessToken, "--json"], baseEnv);
}

let buildUrl: string;

beforeAll(() => {
  const build = JSON.parse(
    run(["build", "get", buildNumber, "--json"], baseEnv).stdout,
  );
  buildUrl = build.url;
});

describe("argos comment", () => {
  test("requires a body to create a comment", () => {
    // Use the build URL (which carries the project) so resolution succeeds and
    // the command reaches the body validation rather than failing earlier on a
    // missing --project.
    let error: CommandError | undefined;
    try {
      run(["comment", "create", buildUrl, "--token", userAccessToken], baseEnv);
    } catch (err) {
      error = err as CommandError;
    }
    expect(error?.status).not.toBe(0);
    expect(error?.stderr).toContain("A comment body is required");
  });

  test("lists comments in JSON mode", () => {
    const comments = JSON.parse(runAs(["comment", "list", buildUrl]).stdout);
    expect(Array.isArray(comments)).toBe(true);
  });

  test("runs the full comment lifecycle", () => {
    // Create
    const created = JSON.parse(
      runAs(["comment", "create", buildUrl, "--body", "CLI e2e comment"])
        .stdout,
    );
    expect(created.id).toBeDefined();
    expect(created.text).toContain("CLI e2e comment");
    const id = created.id;

    // Get
    const fetched = JSON.parse(runAs(["comment", "get", buildUrl, id]).stdout);
    expect(fetched.id).toBe(id);

    // Edit
    const edited = JSON.parse(
      runAs(["comment", "edit", buildUrl, id, "--body", "CLI e2e edited"])
        .stdout,
    );
    expect(edited.text).toContain("CLI e2e edited");
    expect(edited.editedAt).toBeTruthy();

    // React / unreact
    const reacted = JSON.parse(
      runAs(["comment", "react", buildUrl, id, "👍"]).stdout,
    );
    expect(
      reacted.reactions.some((r: { emoji: string }) => r.emoji === "👍"),
    ).toBe(true);
    const unreacted = JSON.parse(
      runAs(["comment", "unreact", buildUrl, id, "👍"]).stdout,
    );
    expect(
      unreacted.reactions.some((r: { emoji: string }) => r.emoji === "👍"),
    ).toBe(false);

    // Resolve / unresolve (acts on the thread root)
    const resolved = JSON.parse(
      runAs(["comment", "resolve", buildUrl, id]).stdout,
    );
    expect(resolved.resolvedAt).toBeTruthy();
    const reopened = JSON.parse(
      runAs(["comment", "unresolve", buildUrl, id]).stdout,
    );
    expect(reopened.resolvedAt).toBeNull();

    // Delete
    const deleted = JSON.parse(
      runAs(["comment", "delete", buildUrl, id]).stdout,
    );
    expect(deleted.id).toBe(id);
  }, 30000);
});
