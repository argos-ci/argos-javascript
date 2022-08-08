import path from "path";
import readScreenshots from "./readScreenshots";

describe("readScreenshots", () => {
  it("should should keep images (with nesting)", async () => {
    const screenshots = await readScreenshots({
      cwd: path.join(__dirname, "../__fixtures__/screenshots"),
    });
    expect(screenshots).toEqual([
      {
        name: "nested/alicia.jpg",
        filename: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/nested/alicia.jpg"
        ),
      },
      {
        name: "penelope.jpg",
        filename: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/penelope.jpg"
        ),
      },
    ]);
  });

  it("should should be possible to ignore some files", async () => {
    const screenshots = await readScreenshots({
      cwd: path.join(__dirname, "../__fixtures__/screenshots"),
      ignore: ["**/alicia.jpg"],
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        filename: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/penelope.jpg"
        ),
      },
    ]);
  });
});
