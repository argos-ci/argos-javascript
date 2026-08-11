import { APIError } from "@argos-ci/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { handleCliError } from "./run";

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
