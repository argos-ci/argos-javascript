import { afterEach, describe, expect, it, vi } from "vitest";
import { APIError } from "./fetch";
import {
  createClient,
  formatAPIError,
  throwAPIError,
  type UserAgentOption,
} from "./index";

describe("createClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Stub the global fetch (what `apiFetch` ultimately calls) and return the
   * `User-Agent` of the request it received.
   */
  async function getSentUserAgent(
    userAgent: UserAgentOption,
  ): Promise<string | null> {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(
      async () => new Response("{}", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({
      baseUrl: "https://api.argos-ci.test/v2/",
      userAgent,
    });
    await client.GET("/me");
    const request = fetchMock.mock.calls[0]?.[0];
    return request?.headers.get("user-agent") ?? null;
  }

  it("sends a static User-Agent", async () => {
    await expect(getSentUserAgent("argos-cli/6.7.0")).resolves.toBe(
      "argos-cli/6.7.0",
    );
  });

  it("resolves a User-Agent supplied as an async function", async () => {
    await expect(
      getSentUserAgent(async () => "argos-cli/6.7.0 agent/claude"),
    ).resolves.toBe("argos-cli/6.7.0 agent/claude");
  });

  it("leaves the header alone when the resolver has no value yet", async () => {
    await expect(getSentUserAgent(() => undefined)).resolves.toBeNull();
  });
});

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
