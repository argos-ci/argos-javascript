import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";

function getConfigPaths() {
  const configDir = resolve(homedir(), ".config", "argos-ci");
  return { configDir, configPath: resolve(configDir, "config.json") };
}

type Config = {
  token?: string;
};

function isValidConfig(value: any): value is Config {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return obj["token"] === undefined || typeof obj["token"] === "string";
}

async function readConfig(): Promise<Config | null> {
  const { configPath } = getConfigPaths();
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isValidConfig(parsed)) {
      console.warn("Warning: Config file has unexpected format, ignoring.");
      return null;
    }
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function writeConfig(config: Config): Promise<void> {
  const { configDir, configPath } = getConfigPaths();
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export async function getStoredToken(): Promise<string | undefined> {
  const config = await readConfig();
  return config?.token;
}

export async function saveToken(token: string): Promise<void> {
  const config = await readConfig();
  await writeConfig({ ...config, token });
}

export async function removeToken(): Promise<void> {
  const config = await readConfig();
  if (config) {
    delete config.token;
    await writeConfig(config);
  }
}
