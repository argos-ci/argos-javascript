import { describe, expect, it } from "vitest";
import { normalizeBaseNames } from "./base-name";

describe("normalizeBaseNames", () => {
  it("wraps a single name in a list", () => {
    expect(normalizeBaseNames("home.png")).toEqual(["home.png"]);
  });

  it("keeps a list as-is, preserving order", () => {
    expect(normalizeBaseNames(["home-variant-b.png", "home.png"])).toEqual([
      "home-variant-b.png",
      "home.png",
    ]);
  });

  it("returns null when nothing is provided", () => {
    expect(normalizeBaseNames(undefined)).toBeNull();
    expect(normalizeBaseNames(null)).toBeNull();
    expect(normalizeBaseNames("")).toBeNull();
    expect(normalizeBaseNames([])).toBeNull();
  });

  it("drops empty names", () => {
    expect(normalizeBaseNames(["", "home.png", ""])).toEqual(["home.png"]);
    expect(normalizeBaseNames([""])).toBeNull();
  });
});
