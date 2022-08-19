import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverScreenshots } from "./discovery";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#discoverScreenshots", () => {
  it("finds all images", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      cwd: join(__dirname, "../__fixtures__/screenshots"),
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: join(__dirname, "../__fixtures__/screenshots/penelope.jpg"),
      },
      {
        name: "nested/alicia.jpg",
        path: join(__dirname, "../__fixtures__/screenshots/nested/alicia.jpg"),
      },
    ]);
  });

  it("ignores files using `ignore` option", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      cwd: join(__dirname, "../__fixtures__/screenshots"),
      ignore: ["**/alicia.jpg"],
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: join(__dirname, "../__fixtures__/screenshots/penelope.jpg"),
      },
    ]);
  });
});
