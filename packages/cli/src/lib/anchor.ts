import { fail } from "./cli-error";

/**
 * Where a comment points on its screenshot diff. A `point` and an `area` use
 * normalized (0-1) coordinates, an area's `x`/`y` being its top-left corner;
 * `lines` is a 1-based inclusive range.
 */
export type CommentAnchor =
  | { type: "point"; x: number; y: number }
  | { type: "area"; x: number; y: number; width: number; height: number }
  | { type: "lines"; from: number; to: number };

/**
 * An area's size is usually computed from two corners, so `x + width` can land
 * a rounding error past the edge of an area drawn up to it.
 */
const AREA_BOUNDS_EPSILON = 1e-9;

function parseNumbers(value: string, count: number): number[] | null {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== count || parts.includes("")) {
    return null;
  }
  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) ? numbers : null;
}

function isNormalized(value: number): boolean {
  return value >= 0 && value <= 1;
}

/**
 * Build a comment anchor from the mutually-exclusive `--anchor-point`,
 * `--anchor-area` and `--anchor-lines` options. Returns `undefined` when none
 * is provided.
 */
export function parseAnchor(options: {
  anchorPoint?: string | undefined;
  anchorArea?: string | undefined;
  anchorLines?: string | undefined;
}): CommentAnchor | undefined {
  const { anchorPoint, anchorArea, anchorLines } = options;

  const given = [
    anchorPoint && "--anchor-point",
    anchorArea && "--anchor-area",
    anchorLines && "--anchor-lines",
  ].filter(Boolean);
  if (given.length > 1) {
    const last = given.pop();
    fail(`${given.join(", ")} and ${last} cannot be combined. Pass only one.`);
  }

  if (anchorPoint) {
    const numbers = parseNumbers(anchorPoint, 2);
    if (!numbers) {
      fail("--anchor-point must be two numbers, e.g. --anchor-point 0.5,0.5.");
    }
    const [x, y] = numbers as [number, number];
    if (!isNormalized(x) || !isNormalized(y)) {
      fail("--anchor-point coordinates must be normalized between 0 and 1.");
    }
    return { type: "point", x, y };
  }

  if (anchorArea) {
    const numbers = parseNumbers(anchorArea, 4);
    if (!numbers) {
      fail(
        "--anchor-area must be four numbers (x,y,width,height), e.g. --anchor-area 0.1,0.2,0.3,0.25.",
      );
    }
    const [x, y, width, height] = numbers as [number, number, number, number];
    if (!numbers.every(isNormalized)) {
      fail("--anchor-area values must be normalized between 0 and 1.");
    }
    if (width <= 0 || height <= 0) {
      fail("--anchor-area width and height must be greater than 0.");
    }
    if (
      x + width > 1 + AREA_BOUNDS_EPSILON ||
      y + height > 1 + AREA_BOUNDS_EPSILON
    ) {
      fail(
        "--anchor-area goes past the edge of the image. Keep x + width and y + height at most 1.",
      );
    }
    return { type: "area", x, y, width, height };
  }

  if (anchorLines) {
    const numbers = parseNumbers(anchorLines, 2);
    if (!numbers) {
      fail("--anchor-lines must be two numbers, e.g. --anchor-lines 10,20.");
    }
    const [from, to] = numbers as [number, number];
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 1 ||
      to < from
    ) {
      fail("--anchor-lines must be a 1-based range where from <= to.");
    }
    return { type: "lines", from, to };
  }

  return undefined;
}
