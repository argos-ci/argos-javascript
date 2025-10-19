import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { stat } from "node:fs/promises";

async function exists(filepath: string) {
  try {
    await stat(filepath);
    return true;
  } catch {
    return false;
  }
}

// This test does not run on CI, a sharp install issue..
describe("#optimizeScreenshot", () => {
  it("optimizes image", async () => {
    const { optimizeScreenshot } = await import("./optimize");
    const sourcePath = join(
      __dirname,
      "../../../__fixtures__/screenshots/penelope.jpg",
    );
    const optimizedPath = await optimizeScreenshot(sourcePath);
    expect(optimizedPath).not.toBe(sourcePath);
    expect(await exists(optimizedPath)).toBe(true);
  });
});
