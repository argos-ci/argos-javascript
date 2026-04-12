import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";

function getConfigPaths() {
  const configDir = resolve(homedir(), ".config", "argos-ci");
  return { configDir, configPath: resolve(configDir, "config.json") };
}

type Config = {
  token?: string;
};

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

  if (!("token" in record) || record.token === undefined) {
    return {};
  }

  if (typeof record.token !== "string") {
    return null;
  }

  return { token: record.token };
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

export async function getStoredToken(): Promise<string | undefined> {
  const config = await readConfig();
  return config?.token;
}

export async function saveToken(token: string): Promise<void> {
  const config = await readConfig();
  await writeConfig({ ...(config ?? {}), token });
}

export async function removeToken(): Promise<void> {
  await writeConfig({});
}
