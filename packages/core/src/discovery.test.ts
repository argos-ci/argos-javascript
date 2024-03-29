import { describe, it, expect } from "vitest";
import { join } from "node:path";
// import { fileURLToPath } from "node:url";
import { discoverScreenshots } from "./discovery";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#discoverScreenshots", () => {
  it("returns empty array if no screenshots are found", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      root: join(__dirname, "../../../__fixtures__/not-found"),
    });
    expect(screenshots).toEqual([]);
  });
  it("finds all images", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      root: join(__dirname, "../../../__fixtures__/screenshots"),
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: join(__dirname, "../../../__fixtures__/screenshots/penelope.jpg"),
      },
      {
        name: "penelope.png",
        path: join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
      },
      {
        name: "nested/alicia.jpg",
        path: join(
          __dirname,
          "../../../__fixtures__/screenshots/nested/alicia.jpg",
        ),
      },
    ]);
  });

  it("ignores files using `ignore` option", async () => {
    const screenshots = await discoverScreenshots(["**/*.{png,jpg,jpeg}"], {
      root: join(__dirname, "../../../__fixtures__/screenshots"),
      ignore: ["**/alicia.jpg"],
    });
    expect(screenshots).toEqual([
      {
        name: "penelope.jpg",
        path: join(__dirname, "../../../__fixtures__/screenshots/penelope.jpg"),
      },
      {
        name: "penelope.png",
        path: join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
      },
    ]);
  });
});
