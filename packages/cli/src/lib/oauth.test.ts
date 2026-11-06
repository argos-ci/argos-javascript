import { describe, expect, it } from "vitest";

import { buildAuthorizeUrl } from "./oauth";

function getRequestedScopes(): string[] {
  const url = new URL(
    buildAuthorizeUrl({
      redirectUri: "http://127.0.0.1:1234/callback",
      state: "state",
      codeChallenge: "challenge",
    }),
  );
  return url.searchParams.get("scope")?.split(" ") ?? [];
}

describe("buildAuthorizeUrl", () => {
  // Every `/accounts/{accountSlug}/...` endpoint requires it: without it,
  // `argos account *` answers 403 with no way to grant it from the CLI.
  it("requests the scope the `account` commands need", () => {
    expect(getRequestedScopes()).toContain("account:admin");
  });
});
