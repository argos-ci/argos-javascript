import { setupJest } from "../mocks/server";
import { ArgosApiClient, createArgosApiClient } from "./api-client";

setupJest();

let apiClient: ArgosApiClient;
beforeAll(() => {
  apiClient = createArgosApiClient({
    baseUrl: "https://api.argos-ci.dev",
    token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
  });
});

describe("#createBuild", () => {
  it("creates build", async () => {
    const result = await apiClient.createBuild({
      commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
      screenshotKeys: ["123", "456"],
    });
    expect(result).toEqual({
      build: {
        id: "123",
        url: "https://app.argos-ci.dev/builds/123",
      },
      screenshots: [
        {
          key: "123",
          putUrl: "https://api.s3.dev/upload/123",
        },
        {
          key: "456",
          putUrl: "https://api.s3.dev/upload/456",
        },
      ],
    });
  });
});

describe("#updateBuild", () => {
  it("updates build", async () => {
    const result = await apiClient.updateBuild({
      buildId: "123",
      screenshots: [
        { key: "123", name: "screenshot 1" },
        { key: "456", name: "screenshot 2" },
      ],
    });
    expect(result).toEqual({
      build: {
        id: "123",
        url: "https://app.argos-ci.dev/builds/123",
      },
    });
  });
});
