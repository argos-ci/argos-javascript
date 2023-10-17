export function getScreenshotName(
  name: string,
  options: {
    viewportWidth?: number;
  } = {},
) {
  let parts = [name];
  if (options.viewportWidth) {
    parts.push(`vw-${options.viewportWidth}`);
  }
  return parts.join(" ");
}
