import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { optimizeScreenshot } from "./optimize";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const exists = async (filepath: string) => {
  try {
    await stat(filepath);
    return true;
  } catch (error) {
    return false;
  }
};

describe("#optimizeScreenshot", () => {
  it("optimizes", async () => {
    const optimizedPath = await optimizeScreenshot(
      join(__dirname, "../__fixtures__/screenshots/penelope.jpg")
    );
    expect(await exists(optimizedPath)).toBe(true);
  });
});
