import path from "path";
import { discoverScreenshots } from "./discovery";

describe("#discoverScreenshots", () => {
  it("finds all images", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      cwd: path.join(__dirname, "../__fixtures__/screenshots"),
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/penelope.jpg"
        ),
      },
      {
        name: "nested/alicia.jpg",
        path: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/nested/alicia.jpg"
        ),
      },
    ]);
  });

  it("ignores files using `ignore` option", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      cwd: path.join(__dirname, "../__fixtures__/screenshots"),
      ignore: ["**/alicia.jpg"],
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: path.resolve(
          __dirname,
          "../__fixtures__/screenshots/penelope.jpg"
        ),
      },
    ]);
  });
});
