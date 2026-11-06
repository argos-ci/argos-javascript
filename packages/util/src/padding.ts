/**
 * Space to capture around an element, in CSS pixels.
 * A number applies to every side. An array follows the CSS `padding`
 * shorthand: `[all]`, `[vertical, horizontal]`, `[top, horizontal, bottom]`
 * or `[top, right, bottom, left]`.
 */
export type ElementPadding =
  | number
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

/**
 * A padding resolved to the space on each side.
 */
export type PaddingSides = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Resolve a padding to the space on each side, like the CSS `padding`
 * shorthand. Throws if a value isn't a non-negative number.
 */
export function resolvePadding(padding: ElementPadding): PaddingSides {
  const values = Array.isArray(padding) ? padding : [padding];
  if (
    values.length < 1 ||
    values.length > 4 ||
    values.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(
      "The `padding` option must be a non-negative number or an array of 1 to 4 non-negative numbers.",
    );
  }
  const [top = 0, right = top, bottom = top, left = right] = values;
  return { top, right, bottom, left };
}

/**
 * Validate the `padding` option of an element screenshot and resolve it.
 * Returns `null` when there is no space to add, so the screenshot can be
 * taken like any element screenshot.
 */
export function resolvePaddingOption(options: {
  padding?: ElementPadding | undefined;
  element?: unknown;
  clip?: unknown;
}): PaddingSides | null {
  const { padding, element, clip } = options;
  if (padding === undefined) {
    return null;
  }
  if (element === undefined) {
    throw new Error("The `padding` option requires the `element` option.");
  }
  if (clip) {
    throw new Error("The `padding` option can't be used with `clip`.");
  }
  const sides = resolvePadding(padding);
  return sides.top || sides.right || sides.bottom || sides.left ? sides : null;
}

/**
 * Get the overlap of two rects, with a zero size when they don't overlap.
 */
export function intersectRects(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}

/**
 * Round a rect out to whole pixels, like an element screenshot does, while
 * tolerating float noise so a box at 10.0000001 doesn't grow a pixel.
 */
function enclose(rect: Rect): Rect {
  const epsilon = 1e-3;
  const x = Math.floor(rect.x + epsilon);
  const y = Math.floor(rect.y + epsilon);
  return {
    x,
    y,
    width: Math.ceil(rect.x + rect.width - epsilon) - x,
    height: Math.ceil(rect.y + rect.height - epsilon) - y,
  };
}

/**
 * Get the area to capture for an element screenshot with a padding.
 * The element box is expanded on each side, rounded out to whole pixels, then
 * clamped to the bounds (the page, or the frame the element is in).
 * The box, the bounds and the result share the same coordinates.
 */
export function getPaddedClip(
  box: Rect,
  padding: PaddingSides,
  bounds: Rect,
): Rect {
  const { top, right, bottom, left } = padding;
  const clip = intersectRects(
    enclose({
      x: box.x - left,
      y: box.y - top,
      width: box.width + left + right,
      height: box.height + top + bottom,
    }),
    enclose(bounds),
  );
  if (!clip.width || !clip.height) {
    throw new Error("The element is outside of the page.");
  }
  return clip;
}

/**
 * Reduce a padding so the area around the box stays within the bounds, for
 * tools that apply the padding themselves.
 * Returns the padding as `[top, right, bottom, left]`.
 */
export function clampPadding(
  box: Rect,
  padding: PaddingSides,
  bounds: Rect,
): [number, number, number, number] {
  const { top, right, bottom, left } = padding;
  const clamp = (value: number, space: number) =>
    Math.max(0, Math.min(value, space));
  return [
    clamp(top, box.y - bounds.y),
    clamp(right, bounds.x + bounds.width - (box.x + box.width)),
    clamp(bottom, bounds.y + bounds.height - (box.y + box.height)),
    clamp(left, box.x - bounds.x),
  ];
}
