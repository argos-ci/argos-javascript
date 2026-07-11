import { describe, expect, it } from "vitest";
import { getTestMetadata } from "./metadata";

describe("outer", () => {
  it("builds test metadata from the current test", async () => {
    const test = await getTestMetadata();
    expect(test).toBeTruthy();
    expect(test?.id).toBeTruthy();
    // The leaf title and the full title path (file + describes + title).
    expect(test?.title).toBe("builds test metadata from the current test");
    expect(test?.titlePath).toEqual([
      "src/metadata.test.ts",
      "outer",
      "builds test metadata from the current test",
    ]);
    // The location file is absolute here; the Node side makes it repo-relative.
    expect(test?.location?.file.endsWith("src/metadata.test.ts")).toBe(true);
  });

  it(
    "reports the configured retries and current retry",
    { retry: 3 },
    async () => {
      const test = await getTestMetadata();
      expect(test?.retries).toBe(3);
      expect(test?.retry).toBe(0);
    },
  );
});
