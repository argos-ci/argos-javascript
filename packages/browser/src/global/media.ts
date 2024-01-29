/**
 * Get the current color scheme of the user.
 */
export function getColorScheme(window: Window) {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Get the current media type of the user.
 */
export function getMediaType(window: Window) {
  return window.matchMedia("print").matches ? "print" : "screen";
}
