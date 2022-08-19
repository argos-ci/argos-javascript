import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashFile } from "./hashing";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#hashFile", () => {
  it("hashes file", async () => {
    const hash = await hashFile(
      join(__dirname, "../__fixtures__/screenshots/penelope.jpg")
    );
    expect(hash).toBe(
      "55744a2cbff9898116df45ce93bfa126db93d79ce337e45d7364c23f36cd9305"
    );
  });
});
