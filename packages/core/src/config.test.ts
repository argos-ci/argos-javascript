import { describe, it, expect } from "vitest";
import { readConfig } from "./config";

describe("#readConfig", () => {
  it("gets config", async () => {
    const config = await readConfig({
      branch: "main",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
    });
    expect(config.commit).toBe("f16f980bd17cccfa93a1ae7766727e67950773d0");
  });

  it("throws with invalid commit", async () => {
    await expect(() =>
      readConfig({ branch: "main", commit: "xx" }),
    ).rejects.toThrow("commit: Invalid commit");
  });

  it("throws with invalid token", async () => {
    await expect(() =>
      readConfig({
        branch: "main",
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "invalid",
      }),
    ).rejects.toThrow(
      "token: Invalid Argos repository token (must be 40 characters)",
    );
  });
});
