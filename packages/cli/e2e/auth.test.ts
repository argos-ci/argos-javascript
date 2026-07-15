import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearStoredCredentials,
  getAccessToken,
  getStoredCredentials,
  saveOAuthTokens,
} from "../src/auth";
import type { OAuthTokenSet } from "../src/lib/oauth";

let homeDir: string;
let originalHome: string | undefined;
let originalUserProfile: string | undefined;

function getConfigPath() {
  return resolve(homeDir, ".config", "argos-ci", "config.json");
}

function tokenSet(overrides: Partial<OAuthTokenSet> = {}): OAuthTokenSet {
  return {
    accessToken: "argos_oat_access",
    refreshToken: "argos_ort_refresh",
    expiresAt: Date.now() + 60 * 60 * 1000,
    scope: "profile",
    ...overrides,
  };
}

beforeEach(async () => {
  originalHome = process.env.HOME;
  originalUserProfile = process.env.USERPROFILE;
  homeDir = await mkdtemp(resolve(tmpdir(), "argos-cli-auth-"));
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }

  if (originalUserProfile === undefined) {
    delete process.env.USERPROFILE;
  } else {
    process.env.USERPROFILE = originalUserProfile;
  }

  await rm(homeDir, { recursive: true, force: true });
});

describe("auth token storage", () => {
  test("returns undefined when no config file exists", async () => {
    await expect(getAccessToken()).resolves.toBeUndefined();
  });

  test("saves and reads an OAuth token set", async () => {
    const tokens = tokenSet();
    await saveOAuthTokens(tokens);

    await expect(getAccessToken()).resolves.toBe("argos_oat_access");
    await expect(readFile(getConfigPath(), "utf8")).resolves.toBe(
      JSON.stringify({ oauth: tokens }, null, 2),
    );
  });

  test("overwrites an existing token set", async () => {
    await saveOAuthTokens(tokenSet({ accessToken: "old" }));
    await saveOAuthTokens(tokenSet({ accessToken: "new" }));

    await expect(getAccessToken()).resolves.toBe("new");
  });

  test("still honors a legacy personal access token", async () => {
    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify({ token: "arp_legacy" }));

    await expect(getAccessToken()).resolves.toBe("arp_legacy");
  });

  test("refreshes an expired access token and persists the rotation", async () => {
    await saveOAuthTokens(
      tokenSet({ accessToken: "stale", expiresAt: Date.now() - 1000 }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "argos_oat_fresh",
          refresh_token: "argos_ort_rotated",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "profile",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAccessToken()).resolves.toBe("argos_oat_fresh");
    expect(fetchMock).toHaveBeenCalledOnce();
    const credentials = await getStoredCredentials();
    expect(credentials.oauth?.refreshToken).toBe("argos_ort_rotated");
  });

  test("warns and returns undefined when refresh fails", async () => {
    await saveOAuthTokens(tokenSet({ expiresAt: Date.now() - 1000 }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 400 })),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(getAccessToken()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  test("ignores invalid JSON config files", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, "{not-json");

    await expect(getAccessToken()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "Warning: Config file is invalid and has been cleared. Run `argos login` again.",
    );
  });

  test("clears config files with a non-string token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify({ token: 123 }));

    await expect(getAccessToken()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "Warning: Config file is invalid and has been cleared. Run `argos login` again.",
    );
  });

  test("ignores config files without credentials", async () => {
    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify({ other: "value" }));

    await expect(getAccessToken()).resolves.toBeUndefined();
  });

  test("clears stored credentials", async () => {
    await saveOAuthTokens(tokenSet());
    await clearStoredCredentials();

    await expect(readFile(getConfigPath(), "utf8")).resolves.toBe(
      JSON.stringify({}, null, 2),
    );
  });
});
