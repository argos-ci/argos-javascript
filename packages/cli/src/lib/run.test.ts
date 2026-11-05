import { APIError } from "@argos-ci/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getScopeHint, handleCliError } from "./run";

/**
 * `handleCliError` ends the process, so both effects have to be intercepted:
 * `process.exit` throws instead of exiting, and the printed message is the
 * assertion target.
 */
function runAndCapture(error: unknown, auth?: "user" | "project"): string {
  const printed: string[] = [];
  vi.spyOn(console, "error").mockImplementation((message: string) => {
    printed.push(message);
  });
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit");
  });
  expect(() => handleCliError(error, auth)).toThrow("process.exit");
  return printed.join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleCliError", () => {
  it("tells the user to log in again when a scope is missing", () => {
    const message = runAndCapture(
      new APIError("Insufficient scope. This endpoint requires: media:write.", {
        status: 403,
      }),
      "project",
    );
    expect(message).toContain("Insufficient scope");
    expect(message).toContain("Run `argos login` again");
    // Switching token type does not add a scope, so that hint would misdirect.
    expect(message).not.toContain("personal access token");
  });

  it("names the missing scope and the access level that grants it", () => {
    const message = runAndCapture(
      new APIError(
        "Insufficient scope. This endpoint requires: account:admin.",
        { status: 403 },
      ),
      "user",
    );
    expect(message).toContain("does not include `account:admin`");
    expect(message).toContain('choose "Admin" access');
    expect(message).not.toContain("personal access token");
  });

  it("keeps the token-type hint for other permission failures", () => {
    const message = runAndCapture(
      new APIError("Forbidden.", { status: 403 }),
      "user",
    );
    expect(message).toContain("personal access token");
    expect(message).not.toContain("Run `argos login` again");
  });

  it("shows a plain message when nothing applies", () => {
    const message = runAndCapture(new Error("Boom."));
    expect(message).toBe("Error: Boom.");
  });
});

describe("getScopeHint", () => {
  it("asks for a new login when a write scope is missing", () => {
    const hint = getScopeHint(
      "Insufficient scope. This endpoint requires: media:write.",
    );
    expect(hint).toBe(
      "Your `argos login` session does not include `media:write`. Run `argos login` again to grant it.",
    );
  });

  it.each(["projects:write", "account:admin"])(
    "points at the Admin access level for %s",
    (scope) => {
      const hint = getScopeHint(
        `Insufficient scope. This endpoint requires: ${scope}.`,
      );
      expect(hint).toContain(`does not include \`${scope}\``);
      expect(hint).toContain('choose "Admin" access on the consent screen');
    },
  );

  it("points at the Admin access level when any required scope is an admin one", () => {
    const hint = getScopeHint(
      "Insufficient scope. This endpoint requires: projects:read, account:admin.",
    );
    expect(hint).toContain("`projects:read`, `account:admin`");
    expect(hint).toContain('choose "Admin" access');
  });

  it("suggests a personal access token for a scope the CLI never requests", () => {
    const hint = getScopeHint(
      "Insufficient scope. This endpoint requires: builds:write.",
    );
    expect(hint).toBe(
      "`argos login` cannot grant `builds:write`. Use a personal access token instead (`--token` or `ARGOS_TOKEN`).",
    );
  });

  it("falls back to a generic hint when the scope is not named", () => {
    expect(getScopeHint("Insufficient scope.")).toBe(
      "Run `argos login` again to grant the permission this command needs.",
    );
  });

  it("never echoes text that is not shaped like a scope", () => {
    const hint = getScopeHint(
      "Insufficient scope. This endpoint requires: \u001b[2Jevil, media:write.",
    );
    expect(hint).not.toContain("\u001b");
    expect(hint).not.toContain("evil");
    expect(hint).toContain("`media:write`");
  });
});
