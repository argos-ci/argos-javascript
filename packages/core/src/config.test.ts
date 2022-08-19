import { createConfig } from "./config";

describe("#createConfig", () => {
  it("gets config", () => {
    const config = createConfig();
    config.load({
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
    });
    expect(config.get()).toEqual({
      apiBaseUrl: "https://api.argos-ci.com/v2/",
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      branch: null,
      token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
      buildName: null,
      parallel: false,
      parallelNonce: null,
      parallelTotal: null,
      ciService: null,
    });
  });

  it("throws with invalid commit", () => {
    expect(() => createConfig().validate()).toThrow(
      "commit: Invalid commit\ntoken: Must be a valid Argos repository token"
    );
  });
});
