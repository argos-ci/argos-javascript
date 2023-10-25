import { access } from "node:fs/promises";

/**
 * Get trace path from screenshot path.
 */
function getTracePath(screenshotPath: string) {
  return screenshotPath + ".pw-trace.zip";
}

/**
 * Get playwright trace from screenshot path.
 * If not found, returns null.
 */
export async function getPlaywrightTracePath(
  screenshotPath: string,
): Promise<string | null> {
  try {
    const tracePath = getTracePath(screenshotPath);
    await access(tracePath);
    return tracePath;
  } catch {
    return null;
  }
}
