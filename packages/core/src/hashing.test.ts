import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { hashFile } from "./hashing";

describe("#hashFile", () => {
  it("hashes file", async () => {
    const hash = await hashFile(
      join(__dirname, "../../../__fixtures__/screenshots/penelope.jpg"),
    );
    expect(hash).toBe(
      "55744a2cbff9898116df45ce93bfa126db93d79ce337e45d7364c23f36cd9305",
    );
  });
});
