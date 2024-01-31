import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { upload } from "./upload";
import { setupMockServer } from "../mocks/server";

setupMockServer();

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
            /__fixtures__\/screenshots\/penelope\.jpg$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: null,
        },
        {
          name: "penelope.png",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/penelope\.png$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: {
            browser: {
              name: "chromium",
              version: "119.0.6045.9",
            },
            automationLibrary: {
              name: "playwright",
              version: "1.39.0",
            },
            colorScheme: "light",
            mediaType: "screen",
            sdk: {
              name: "@argos-ci/playwright",
              version: "0.0.7",
            },
            url: "https://localhost:3000/test",
            viewport: {
              height: 768,
              width: 1024,
            },
          },
        },
        {
          name: "nested/alicia.jpg",
          path: expect.stringMatching(
            /__fixtures__\/screenshots\/nested\/alicia\.jpg$/,
          ),
          pwTrace: null,
          optimizedPath: expect.any(String),
          hash: expect.stringMatching(/^[A-Fa-f0-9]{64}$/),
          metadata: null,
        },
      ],
    });
  });
});
