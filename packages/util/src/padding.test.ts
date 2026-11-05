import { describe, expect, it } from "vitest";
import { clampPadding, getPaddedClip, resolvePadding } from "./padding";

describe("resolvePadding", () => {
  it("applies a number to every side", () => {
    expect(resolvePadding(8)).toEqual({
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    });
  });

  it("follows the CSS shorthand", () => {
    expect(resolvePadding([1])).toEqual({
      top: 1,
      right: 1,
      bottom: 1,
      left: 1,
    });
    expect(resolvePadding([1, 2])).toEqual({
      top: 1,
      right: 2,
      bottom: 1,
      left: 2,
    });
    expect(resolvePadding([1, 2, 3])).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 2,
    });
    expect(resolvePadding([1, 2, 3, 4])).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 4,
    });
  });

  it("rejects invalid values", () => {
    const message =
      "The `padding` option must be a non-negative number or an array of 1 to 4 non-negative numbers.";
    expect(() => resolvePadding(-1)).toThrow(message);
    expect(() => resolvePadding(Number.NaN)).toThrow(message);
    expect(() => resolvePadding(Infinity)).toThrow(message);
    expect(() => resolvePadding([] as any)).toThrow(message);
    expect(() => resolvePadding([1, 2, 3, 4, 5] as any)).toThrow(message);
    expect(() => resolvePadding("8" as any)).toThrow(message);
  });
});

describe("getPaddedClip", () => {
  const page = { x: 0, y: 0, width: 1000, height: 2000 };

  it("expands the box on each side", () => {
    expect(
      getPaddedClip(
        { x: 100, y: 200, width: 50, height: 60 },
        [1, 2, 3, 4],
        page,
      ),
    ).toEqual({ x: 96, y: 199, width: 56, height: 64 });
  });

  it("rounds out to whole pixels", () => {
    expect(
      getPaddedClip({ x: 10.5, y: 20.25, width: 30.5, height: 40.5 }, 0, page),
    ).toEqual({ x: 10, y: 20, width: 31, height: 41 });
    // Float noise doesn't add a pixel.
    expect(
      getPaddedClip(
        { x: 10.0000001, y: 20, width: 29.9999998, height: 40 },
        0,
        page,
      ),
    ).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it("clamps to the document", () => {
    expect(
      getPaddedClip({ x: 5, y: 1990, width: 990, height: 10 }, 20, page),
    ).toEqual({ x: 0, y: 1970, width: 1000, height: 30 });
  });

  it("clamps to a frame", () => {
    expect(
      getPaddedClip({ x: 110, y: 210, width: 50, height: 50 }, 20, {
        x: 100.5,
        y: 200,
        width: 300,
        height: 55.5,
      }),
    ).toEqual({ x: 100, y: 200, width: 80, height: 56 });
  });

  it("throws when the element is outside of the bounds", () => {
    expect(() =>
      getPaddedClip({ x: 1100, y: 0, width: 10, height: 10 }, 20, page),
    ).toThrow("The element is outside of the page.");
  });
});

describe("clampPadding", () => {
  const page = { x: 0, y: 0, width: 1000, height: 2000 };

  it("keeps a padding that fits", () => {
    expect(
      clampPadding(
        { x: 100, y: 100, width: 50, height: 50 },
        [1, 2, 3, 4],
        page,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("reduces the sides overflowing the bounds", () => {
    expect(
      clampPadding({ x: 5, y: 0, width: 990, height: 1990 }, 20, page),
    ).toEqual([0, 5, 10, 5]);
  });
});
