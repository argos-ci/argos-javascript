import { fail } from "./cli-error";

/**
 * Where a comment points on its screenshot diff. A `point` uses normalized
 * (0–1) coordinates; `lines` is a 1-based inclusive range.
 */
export type CommentAnchor =
  | { type: "point"; x: number; y: number }
  | { type: "lines"; from: number; to: number };

function parsePair(value: string): [number, number] | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return [parts[0] as number, parts[1] as number];
}

/**
 * Build a comment anchor from the mutually-exclusive `--anchor-point` and
 * `--anchor-lines` options. Returns `undefined` when neither is provided.
 */
export function parseAnchor(options: {
  anchorPoint?: string | undefined;
  anchorLines?: string | undefined;
}): CommentAnchor | undefined {
  const { anchorPoint, anchorLines } = options;

  if (anchorPoint && anchorLines) {
    fail("Use either --anchor-point or --anchor-lines, not both.");
  }

  if (anchorPoint) {
    const pair = parsePair(anchorPoint);
    if (!pair) {
      fail("--anchor-point must be two numbers, e.g. --anchor-point 0.5,0.5.");
    }
    const [x, y] = pair;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      fail("--anchor-point coordinates must be normalized between 0 and 1.");
    }
    return { type: "point", x, y };
  }

  if (anchorLines) {
    const pair = parsePair(anchorLines);
    if (!pair) {
      fail("--anchor-lines must be two numbers, e.g. --anchor-lines 10,20.");
    }
    const [from, to] = pair;
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
