import { join } from "node:path";
import { stat } from "fs/promises";
import { optimizeScreenshot } from "./optimize";

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
