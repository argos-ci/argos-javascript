/**
 * Build a screenshot name from a test name and options.
 */
export function getScreenshotName(
  name: string,
  options: {
    viewportWidth?: number;
  } = {},
) {
  return sanitizePath(
    `${name}${options.viewportWidth ? ` vw-${options.viewportWidth}` : ""}`,
  );
}

/**
 * Sanitize a path to be safe on all OSes.
 */
function sanitizePath(name: string) {
  return name
    .split("/")
    .map((filename) => sanitizeFilename(filename))
    .join("/");
}

// From https://github.com/sindresorhus/filename-reserved-regex
function filenameReservedRegex() {
  // eslint-disable-next-line no-control-regex
  return /[<>:"/\\|?*\u0000-\u001F]|[. ]$/g;
}

// From https://github.com/sindresorhus/filename-reserved-regex
function windowsReservedNameRegex() {
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i;
}

/**
 * Sanitize a filename to be safe on all OSes.
 */
function sanitizeFilename(name: string): string {
  const replacement = "-";
  const sanitized = name.replace(filenameReservedRegex(), replacement);

  if (windowsReservedNameRegex().test(sanitized)) {
    return `${sanitized}${replacement}`;
  }

  return sanitized;
}
