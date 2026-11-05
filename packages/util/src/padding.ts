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
export function resolvePadding(padding: ElementPadding): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const values = Array.isArray(padding) ? padding : [padding];
  if (
    values.length < 1 ||
    values.length > 4 ||
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error(
      "The `padding` option must be a non-negative number or an array of 1 to 4 non-negative numbers.",
    );
  }
  const [top = 0, right = top, bottom = top, left = right] = values;
  return { top, right, bottom, left };
}

/**
 * Round a rect out to whole pixels, like an element screenshot does, while
 * tolerating float noise so a box at 10.0000001 doesn't grow a pixel.
 */
function enclose(rect: Rect) {
  const epsilon = 1e-3;
  return {
    x1: Math.floor(rect.x + epsilon),
    y1: Math.floor(rect.y + epsilon),
    x2: Math.ceil(rect.x + rect.width - epsilon),
    y2: Math.ceil(rect.y + rect.height - epsilon),
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
  padding: ElementPadding,
  bounds: Rect,
): Rect {
  const { top, right, bottom, left } = resolvePadding(padding);
  const area = enclose({
    x: box.x - left,
    y: box.y - top,
    width: box.width + left + right,
    height: box.height + top + bottom,
  });
  const limits = enclose(bounds);
  const x1 = Math.max(area.x1, limits.x1);
  const y1 = Math.max(area.y1, limits.y1);
  const x2 = Math.min(area.x2, limits.x2);
  const y2 = Math.min(area.y2, limits.y2);
  if (x2 <= x1 || y2 <= y1) {
    throw new Error("The element is outside of the page.");
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Reduce a padding so the area around the box stays within the bounds, for
 * tools that apply the padding themselves.
 * Returns the padding as `[top, right, bottom, left]`.
 */
export function clampPadding(
  box: Rect,
  padding: ElementPadding,
  bounds: Rect,
): [number, number, number, number] {
  const { top, right, bottom, left } = resolvePadding(padding);
  const clamp = (value: number, space: number) =>
    Math.max(0, Math.min(value, space));
  return [
    clamp(top, box.y - bounds.y),
    clamp(right, bounds.x + bounds.width - (box.x + box.width)),
    clamp(bottom, bounds.y + bounds.height - (box.y + box.height)),
    clamp(left, box.x - bounds.x),
  ];
}
