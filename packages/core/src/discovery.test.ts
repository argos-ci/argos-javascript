import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { discoverSnapshots } from "./discovery";

describe("#discoverSnapshots", () => {
  it("returns empty array if no screenshots are found", async () => {
    const screenshots = await discoverSnapshots(["**/*.{png,jpg,jpeg}"], {
      root: join(__dirname, "../../../__fixtures__/not-found"),
    });
    expect(screenshots).toEqual([]);
  });
  it("finds all images", async () => {
    const screenshots = await discoverSnapshots(["**/*.{png,jpg,jpeg}"], {
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
    const screenshots = await discoverSnapshots(["**/*.{png,jpg,jpeg}"], {
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
