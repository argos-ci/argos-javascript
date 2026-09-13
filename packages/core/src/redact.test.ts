import { describe, expect, it } from "vitest";
import { redactEnv, redactSecrets } from "./redact";

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

  it("copies a cycle rather than walking it forever", () => {
    const node: Record<string, unknown> = { token: "a".repeat(40) };
    node.self = node;

    const redacted = redactSecrets(node) as Record<string, unknown>;

    expect(redacted.token).toBe("[redacted]");
    expect(redacted.self).toBe(redacted);
  });
});

describe("redactEnv", () => {
  it("keeps the variables CI detection reads", () => {
    expect(
      redactEnv({
        CI: "true",
        GITHUB_ACTIONS: "true",
        GITHUB_REPOSITORY: "argos-ci/argos-javascript",
        GITHUB_SHA: "0".repeat(40),
        ARGOS_BRANCH: "main",
      }),
    ).toEqual({
      CI: "true",
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "argos-ci/argos-javascript",
      GITHUB_SHA: "0".repeat(40),
      ARGOS_BRANCH: "main",
    });
  });

  it("redacts the credentials among them (GHSA-28pg-v3hp-9g7f)", () => {
    expect(
      redactEnv({
        ARGOS_TOKEN: "a".repeat(40),
        GITHUB_TOKEN: "ghp_canary",
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "oidc-request-token",
      }),
    ).toEqual({
      ARGOS_TOKEN: "[redacted]",
      GITHUB_TOKEN: "[redacted]",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "[redacted]",
    });
  });

  it("reduces a variable it does not know to its name", () => {
    expect(redactEnv({ MY_APP_CANARY: "s3cret", HOME: "/home/argos" })).toEqual(
      {
        MY_APP_CANARY: "[redacted]",
        HOME: "[redacted]",
      },
    );
  });

  it("leaves out the variables that are not set", () => {
    expect(redactEnv({ CI: "true", ARGOS_BRANCH: undefined })).toEqual({
      CI: "true",
    });
  });
});
