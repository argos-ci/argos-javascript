import path from "path";
import fetch from "node-fetch";
import upload from "./upload";
import config from "./config";
import pkg from "../package.json";

jest.mock("node-fetch");

describe("upload", () => {
  beforeEach(() => {
    config.set("branch", "master");
    config.set("commit", "0a5470f4d04d66501c126840e208a8f99d36e306");
    config.set("endpoint", "http://localhost");
  });

  afterEach(() => {
    config.reset("branch");
    config.reset("commit");
    config.reset("endpoint");
  });

  describe("with missing token", () => {
    it("should throw", async () => {
      expect.assertions(1);

      try {
        await upload({
          directory: path.join(__dirname, "../__fixtures__/screenshots"),
        });
      } catch (error) {
        expect(error.message).toMatch("Token missing");
      }
    });
  });

  describe("with missing branch", () => {
    beforeEach(() => {
      config.set("branch", undefined);
    });

    it("should throw", async () => {
      expect.assertions(1);

      try {
        await upload({
          directory: path.join(__dirname, "../__fixtures__/screenshots"),
          token: "myToken",
        });
      } catch (error) {
        expect(error.message).toMatch("Branch missing");
      }
    });
  });

  describe("with missing commit", () => {
    beforeEach(() => {
      config.set("commit", undefined);
    });

    it("should throw", async () => {
      expect.assertions(1);

      try {
        await upload({
          directory: path.join(__dirname, "../__fixtures__/screenshots"),
          token: "myToken",
        });
      } catch (error) {
        expect(error.message).toMatch("Commit missing");
      }
    });
  });

  describe("without a directory", () => {
    it("should throw", async () => {
      expect.assertions(1);

      try {
        await upload({
          directory: path.join(__dirname, "../__fixtures__/not-a-directory"),
          token: "myToken",
        });
      } catch (error) {
        expect(error.message).toBe("The path provided is not a directory.");
      }
    });
  });

  describe("without screenshots", () => {
    beforeEach(() => {
      fetch.mockImplementation(async () => {});
    });

    it("should throw", async () => {
      expect.assertions(1);

      try {
        await upload({
          directory: path.join(__dirname, "../__fixtures__/screenshots/empty"),
          token: "myToken",
        });
      } catch (error) {
        expect(error.message).toBe(
          "The path provided doesn't contain any image (**/*.{png,jpg})."
        );
      }
    });

    it("should not throw with externalBuildId", async () => {
      await upload({
        directory: path.join(__dirname, "../__fixtures__/screenshots/empty"),
        token: "myToken",
        externalBuildId: "x",
      });
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("with all good", () => {
    beforeEach(() => {
      fetch.mockImplementation(async () => {});
    });

    it("should upload files", async () => {
      await upload({
        directory: path.join(__dirname, "../__fixtures__/screenshots"),
        token: "myToken",
      });
      expect(fetch.mock.calls[0][0]).toBe("http://localhost/builds");
      expect(fetch.mock.calls[0][1].headers).toEqual({
        "X-Argos-CLI-Version": pkg.version,
      });
    });
  });
});
