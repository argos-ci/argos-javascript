import { describe, it, expect } from "vitest";
import { createConfig } from "./config";

describe("#createConfig", () => {
  it("gets config", () => {
    const config = createConfig();
    config.load({ commit: "f16f980bd17cccfa93a1ae7766727e67950773d0" });
    expect(config.get()).toEqual({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      branch: null,
      token: null,
      buildName: null,
      parallel: false,
      parallelNonce: null,
      parallelTotal: null,
      ciService: null,
      jobId: null,
      runId: null,
      prNumber: null,
      repository: null,
      owner: null,
      prHeadCommit: null,
      referenceBranch: null,
      referenceCommit: null,
    });
  });

  it("throws with invalid commit", () => {
    expect(() => createConfig().validate()).toThrow("commit: Invalid commit");
  });

  it("throws with invalid token", () => {
    const config = createConfig();
    config.load({
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      token: "invalid",
    });
    expect(() => config.validate()).toThrow(
      "token: Invalid Argos repository token (must be 40 characters)",
    );
  });
});
