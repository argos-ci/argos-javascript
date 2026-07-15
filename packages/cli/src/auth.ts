import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

import {
  OAuthTokenError,
  refreshTokenSet,
  type OAuthTokenSet,
} from "./lib/oauth";

function getConfigPaths() {
  const configDir = resolve(homedir(), ".config", "argos-ci");
  return { configDir, configPath: resolve(configDir, "config.json") };
}

type Config = {
  /**
   * Legacy long-lived personal access token from a pre-OAuth `argos login`.
   * Still honored so existing installs keep working until the next login.
   */
  token?: string;
  /** OAuth token set from the current `argos login` flow. */
  oauth?: OAuthTokenSet;
};

function parseOAuthTokenSet(value: unknown): OAuthTokenSet | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.accessToken === "string" &&
    typeof record.refreshToken === "string" &&
    typeof record.expiresAt === "number"
  ) {
    return {
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      expiresAt: record.expiresAt,
      scope: typeof record.scope === "string" ? record.scope : "",
    };
  }
  return undefined;
}

function parseConfig(raw: string): Config | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  // A present-but-non-string `token` means a corrupted config; treat it as
  // invalid so the caller clears the file and prompts a re-login, rather than
  // silently ignoring it.
  if (
    "token" in record &&
    record.token !== undefined &&
    typeof record.token !== "string"
  ) {
    return null;
  }
  const config: Config = {};
  if (typeof record.token === "string") {
    config.token = record.token;
  }
  const oauth = parseOAuthTokenSet(record.oauth);
  if (oauth) {
    config.oauth = oauth;
  }
  return config;
}

async function clearConfig(): Promise<void> {
  const { configPath } = getConfigPaths();
  try {
    await unlink(configPath);
  } catch {
    // ignore if file doesn't exist
  }
}

async function readConfig(): Promise<Config | null> {
  const { configPath } = getConfigPaths();
  try {
    const raw = await readFile(configPath, "utf8");
    const config = parseConfig(raw);
    if (config === null) {
      console.warn(
        "Warning: Config file is invalid and has been cleared. Run `argos login` again.",
      );
      await clearConfig();
      return null;
    }
    return config;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }
}

async function writeConfig(config: Config): Promise<void> {
  const { configDir, configPath } = getConfigPaths();
  await mkdir(configDir, { recursive: true });
  const tmpPath = configPath + ".tmp";
  await writeFile(tmpPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
  await rename(tmpPath, configPath);
}

/** Persist the OAuth token set from a successful login or refresh. */
export async function saveOAuthTokens(tokens: OAuthTokenSet): Promise<void> {
  await writeConfig({ oauth: tokens });
}

/**
 * Return a valid access token for API calls, or `undefined` when not logged in.
 * Transparently refreshes (and persists) an expired OAuth access token, and
 * falls back to a legacy personal access token when present.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const config = await readConfig();
  if (!config) {
    return undefined;
  }
  if (config.oauth) {
    if (Date.now() < config.oauth.expiresAt) {
      return config.oauth.accessToken;
    }
    try {
      const tokens = await refreshTokenSet(config.oauth.refreshToken);
      await saveOAuthTokens(tokens);
      return tokens.accessToken;
    } catch (err) {
      // A still-valid legacy personal access token is a usable fallback when
      // the OAuth refresh cannot complete.
      if (config.token) {
        return config.token;
      }
      if (err instanceof OAuthTokenError) {
        // The server rejected the refresh token — the session is really gone.
        console.warn(
          "Warning: Your Argos session has expired. Run `argos login` again.",
        );
      } else {
        // Transient failure (offline, DNS, timeout): don't claim the session
        // expired, and keep the stored tokens so a later retry can succeed.
        console.warn(
          "Warning: Could not reach Argos to refresh your session. Check your connection and try again.",
        );
      }
      return undefined;
    }
  }
  return config.token;
}

/** Read the stored credentials without refreshing (used by `logout`). */
export async function getStoredCredentials(): Promise<{
  legacyToken?: string;
  oauth?: OAuthTokenSet;
}> {
  const config = await readConfig();
  return {
    legacyToken: config?.token,
    oauth: config?.oauth,
  };
}

/** Remove all stored credentials. */
export async function clearStoredCredentials(): Promise<void> {
  await writeConfig({});
}
