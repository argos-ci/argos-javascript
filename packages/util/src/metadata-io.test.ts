import { describe, it, expect } from "vitest";
import { readMetadata } from "./metadata-io";
import { join } from "node:path";

describe("#readMetadata", () => {
  it("returns null if file is not found", async () => {
    const result = await readMetadata("xx.png");
    expect(result).toBe(null);
  });

  it("throws if invalid", async () => {
    await expect(
      readMetadata(
        join(__dirname, "../../../__fixtures__/screenshots/invalid"),
      ),
    ).rejects.toThrow("Failed to read metadata");
  });

  it("reads if valid", async () => {
    const result = await readMetadata(
      join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
    );
    expect(result).toEqual({
      url: "https://localhost:3000/test",
      viewport: { width: 1024, height: 768 },
      colorScheme: "light",
      mediaType: "screen",
      browser: { name: "chromium", version: "119.0.6045.9" },
      automationLibrary: { name: "playwright", version: "1.39.0" },
      sdk: { name: "@argos-ci/playwright", version: "0.0.7" },
      threshold: 0.2,
    });
  });
});
