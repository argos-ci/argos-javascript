import path from "path";
import fetch from "node-fetch";
import cancel from "./cancel";
import config from "./config";
import pkg from "../package.json";

jest.mock("node-fetch");

describe("cancel", () => {
  beforeEach(() => {
    config.set("endpoint", "http://localhost");
  });

  afterEach(() => {
    config.reset("endpoint");
  });

  describe("with missing token", () => {
    it("should throw", async () => {
      expect.assertions(1);

      try {
        await cancel({
          directory: path.join(__dirname, "../__fixtures__/screenshots"),
        });
      } catch (error) {
        expect(error.message).toMatch("Token missing");
      }
    });
  });

  describe.only("with all good", () => {
    beforeEach(() => {
      fetch.mockImplementation(async () => {});
    });

    it("should ping cancel-build api", async () => {
      await cancel({
        token: "myToken",
      });
      expect(fetch.mock.calls[0][0]).toBe("http://localhost/cancel-build");
      expect(fetch.mock.calls[0][1].headers).toEqual({
        "X-Argos-CLI-Version": pkg.version,
        "Content-Type": "application/json",
      });
    });
  });
});
