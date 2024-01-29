export type { ArgosGlobal } from "./global/index";

/**
 * Read the global script and return it as a string.
 */
export function getGlobalScript() {
  return process.env.GLOBAL_SCRIPT as string;
}
