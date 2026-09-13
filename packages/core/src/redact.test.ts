import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("redacts a credential wherever it sits", () => {
    expect(
      redactSecrets({
        token: "a".repeat(40),
        apiBaseUrl: "https://api.argos-ci.com",
        parallel: { nonce: "1", secret: "shh" },
        requests: [{ authorization: "Bearer aaa" }],
      }),
    ).toEqual({
      token: "[redacted]",
      apiBaseUrl: "https://api.argos-ci.com",
      parallel: { nonce: "1", secret: "[redacted]" },
      requests: [{ authorization: "[redacted]" }],
    });
  });

  it.each([
    "token",
    "accessToken",
    "refresh_token",
    "ARGOS_TOKEN",
    "apiKey",
    "api_key",
    "password",
    "clientSecret",
    "Authorization",
    "cookie",
    "signature",
  ])("redacts the %s property", (key) => {
    expect(redactSecrets({ [key]: "value" })).toEqual({ [key]: "[redacted]" });
  });

  it("keeps an empty value, so an unresolved token stays visible", () => {
    expect(redactSecrets({ token: null, project: "argos" })).toEqual({
      token: null,
      project: "argos",
    });
  });

  it("leaves the value it was given untouched", () => {
    const params = { token: "a".repeat(40) };
    redactSecrets(params);
    expect(params.token).toBe("a".repeat(40));
  });

  it("passes through what it cannot walk", () => {
    const error = new Error("boom");
    expect(redactSecrets(error)).toBe(error);
    expect(redactSecrets("plain")).toBe("plain");
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
  });

  it("never calls a getter it walks", () => {
    let called = false;
    const params = {
      commit: "0".repeat(40),
      get token() {
        called = true;
        return "a".repeat(40);
      },
    };

    const redacted = redactSecrets(params);

    expect(called).toBe(false);
    // Rendered as `[Getter]`, the way the debug output always showed it.
    expect(inspect(redacted)).toContain("[Getter]");
    expect(inspect(redacted)).not.toContain("a".repeat(40));
  });

  it("survives a getter that throws", () => {
    const params = {
      commit: "0".repeat(40),
      get metadata(): unknown {
        throw new Error("boom");
      },
    };

    expect(() => redactSecrets(params)).not.toThrow();
  });

  it("copies a cycle rather than walking it forever", () => {
    const node: Record<string, unknown> = { token: "a".repeat(40) };
    node.self = node;

    const redacted = redactSecrets(node) as Record<string, unknown>;

    expect(redacted.token).toBe("[redacted]");
    expect(redacted.self).toBe(redacted);
  });
});
