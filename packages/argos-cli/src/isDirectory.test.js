/* eslint-disable max-len */
import path from "path";
import isDirectory from "./isDirectory";

describe("isDirectory", () => {
  it("should return true if it's a directory", async () => {
    expect(
      await isDirectory(path.join(__dirname, "../__fixtures__/screenshots"))
    ).toBe(true);
    expect(
      await isDirectory(
        path.join(__dirname, "../__fixtures__/screenshots/penelope.jpg")
      )
    ).toBe(false);
    expect(
      await isDirectory(path.join(__dirname, "../__fixtures__/not-a-directory"))
    ).toBe(false);
  });
});
