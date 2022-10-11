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
      repository: null,
      owner: null,
    });
  });

  it("throws with invalid commit", () => {
    expect(() => createConfig().validate()).toThrow("commit: Invalid commit");
  });
});
