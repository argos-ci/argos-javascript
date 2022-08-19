import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { upload } from "./upload";
import { setupJest } from "../mocks/server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

setupJest();

describe("#upload", () => {
  it("uploads", async () => {
    const result = await upload({
      apiBaseUrl: "https://api.argos-ci.dev",
      root: join(__dirname, "../../../__fixtures__/screenshots"),
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
    });

    expect(result).toEqual({
      build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
      screenshots: [
        {
          name: "penelope.jpg",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/penelope\.jpg$/
          ),
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
        },
        {
          name: "nested/alicia.jpg",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/nested\/alicia\.jpg$/
          ),
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
        },
      ],
    });
  });
});
