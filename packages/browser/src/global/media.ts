/**
 * Get the current color scheme of the user.
 */
export function getColorScheme() {
  const { colorScheme } = window.getComputedStyle(document.body);
  return colorScheme === "dark" ||
    colorScheme === "dark only" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Get the current media type of the user.
 */
export function getMediaType() {
  return window.matchMedia("print").matches ? "print" : "screen";
}
