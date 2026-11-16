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
 * Browser whose screenshots keep their plain name. It is the default of every
 * test runner, so existing baselines stay valid when another browser is added.
 */
const DEFAULT_BROWSER = "chromium";

/**
 * Suffix that keeps apart the screenshots of each browser, when the same tests
 * run in several of them: ` browser-[firefox]`, or `""` for Chromium or an
 * unknown browser.
 */
export function getBrowserSuffix(browserName: string | null | undefined) {
  return browserName && browserName !== DEFAULT_BROWSER
    ? ` browser-[${browserName}]`
    : "";
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
