/* eslint-disable max-len */
import path from "path";
import isReadable from "./isReadable";

describe("isReadable", () => {
  it("should return true if it is readable", async () => {
    expect(
      await isReadable(path.join(__dirname, "../__fixtures__/screenshots"))
    ).toBe(true);
    expect(
      await isReadable(
        path.join(__dirname, "../__fixtures__/screenshots/penelope.jpg")
      )
    ).toBe(true);
    expect(
      await isReadable(path.join(__dirname, "../__fixtures__/not-a-directory"))
    ).toBe(false);
  });
});
