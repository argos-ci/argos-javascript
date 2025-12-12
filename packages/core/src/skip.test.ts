import { describe, it, expect } from "vitest";
import { setupMockServer } from "../mocks/server";
import { skip } from "./skip";

setupMockServer();

describe("#skip", () => {
  it("marks the build as skipped", async () => {
    const result = await skip({
      branch: "main",
      apiBaseUrl: "https://api.argos-ci.dev",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
    });

    expect(result).toEqual({
      build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
    });
  });
});
