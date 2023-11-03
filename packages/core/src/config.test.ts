import { describe, it, expect } from "vitest";
import { readConfig } from "./config";

describe("#createConfig", () => {
  it("gets config", () => {
    const config = readConfig({
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
    });
    expect(config.commit).toBe("f16f980bd17cccfa93a1ae7766727e67950773d0");
  });

  it("throws with invalid commit", () => {
    expect(() => readConfig({ commit: "xx" })).toThrow(
      "commit: Invalid commit",
    );
  });

  it("throws with invalid token", () => {
    expect(() =>
      readConfig({
        commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        token: "invalid",
      }),
    ).toThrow("token: Invalid Argos repository token (must be 40 characters)");
  });
});
