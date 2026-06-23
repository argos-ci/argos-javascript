import { describe, expect, it } from "vitest";
import { APIError } from "./fetch";
import { formatAPIError, throwAPIError } from "./index";

describe("formatAPIError", () => {
  it("formats a structured API error", () => {
    expect(formatAPIError({ error: "Build not found" })).toBe(
      "Build not found",
    );
  });

  it("appends details when present", () => {
    expect(
      formatAPIError({
        error: "Invalid request",
        details: [{ message: "commit is required" }],
      }),
    ).toBe("Invalid request: commit is required");
  });

  it("falls back to the HTTP status when the body is empty", () => {
    const response = new Response(null, {
      status: 413,
      statusText: "Payload Too Large",
    });
    expect(formatAPIError({}, response)).toBe("HTTP 413 Payload Too Large");
  });

  it("includes a non-JSON body alongside the status", () => {
    const response = new Response(null, {
      status: 502,
      statusText: "Bad Gateway",
    });
    expect(formatAPIError("<html>Bad Gateway</html>", response)).toBe(
      "HTTP 502 Bad Gateway: <html>Bad Gateway</html>",
    );
  });

  it("truncates long raw bodies", () => {
    const body = "x".repeat(1000);
    const message = formatAPIError(body);
    expect(message.endsWith("…")).toBe(true);
    expect(message.length).toBeLessThan(body.length);
  });

  it("falls back to a generic message when nothing is available", () => {
    expect(formatAPIError(undefined)).toBe("Unknown API error");
    expect(formatAPIError({})).toBe("Unknown API error");
  });

  it("ignores a malformed error object missing the `error` field", () => {
    const response = new Response(null, { status: 429 });
    expect(formatAPIError({ message: "rate limited" }, response)).toBe(
      'HTTP 429: {"message":"rate limited"}',
    );
  });
});

describe("throwAPIError", () => {
  it("throws an APIError carrying the status and raw data", () => {
    const response = new Response(null, {
      status: 413,
      statusText: "Payload Too Large",
    });
    const error = getThrownError(() => throwAPIError({}, response));
    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).message).toBe("HTTP 413 Payload Too Large");
    expect((error as APIError).status).toBe(413);
    expect((error as APIError).data).toEqual({});
  });
});

/**
 * Run `fn` and return the error it throws (fails the test if it doesn't throw).
 */
function getThrownError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to throw");
}
