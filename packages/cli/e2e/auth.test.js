import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getStoredToken, removeToken, saveToken } from "../src/auth";

let homeDir;
let originalHome;
let originalUserProfile;

function getConfigPath() {
  return resolve(homeDir, ".config", "argos-ci", "config.json");
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
    await expect(getStoredToken()).resolves.toBeUndefined();
  });

  test("saves a token in the user config directory", async () => {
    await saveToken("argos-token");

    await expect(getStoredToken()).resolves.toBe("argos-token");

    const configPath = getConfigPath();
    await expect(readFile(configPath, "utf8")).resolves.toBe(
      JSON.stringify({ token: "argos-token" }, null, 2),
    );
  });

  test("overwrites an existing token", async () => {
    await saveToken("old-token");
    await saveToken("new-token");

    await expect(getStoredToken()).resolves.toBe("new-token");
    await expect(readFile(getConfigPath(), "utf8")).resolves.toBe(
      JSON.stringify({ token: "new-token" }, null, 2),
    );
  });

  test("ignores invalid JSON config files", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, "{not-json");

    await expect(getStoredToken()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "Warning: Config file is invalid and has been cleared. Run `argos login` again.",
    );
  });

  test("ignores config files without a token", async () => {
    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify({ other: "value" }));

    await expect(getStoredToken()).resolves.toBeUndefined();
  });

  test("removes the stored token", async () => {
    await saveToken("argos-token");
    await removeToken();

    await expect(readFile(getConfigPath(), "utf8")).resolves.toBe(
      JSON.stringify({}, null, 2),
    );
  });
});
