/**
 * Builds the URL of the page a screenshot was taken on, as it is served by a
 * preview deployment. Either a base URL that replaces the origin, or a function
 * that rewrites the whole URL.
 */
export type PreviewUrlFormatter =
  | {
      baseUrl: string;
    }
  | ((url: string) => string);

const DEPLOYMENTS_DOCS_URL = "https://argos-ci.com/docs/learn/deployments";

const REPORT_DEPLOYMENT_HINT = `Report the deployment to Argos instead with "argos deploy --url <url>", and Argos links each screenshot to the same page on it. Learn more: ${DEPLOYMENTS_DOCS_URL}`;

const DEPRECATION_WARNINGS = {
  env: `[Argos] ARGOS_PREVIEW_BASE_URL is deprecated. ${REPORT_DEPLOYMENT_HINT}`,
  option: `[Argos] The "previewUrl" option is deprecated. ${REPORT_DEPLOYMENT_HINT}`,
} as const;

type DeprecatedSource = keyof typeof DEPRECATION_WARNINGS;

/** Sources already warned about, so each warning shows once per process. */
const warnedSources = new Set<DeprecatedSource>();

function warnDeprecated(source: DeprecatedSource): void {
  if (warnedSources.has(source)) {
    return;
  }
  warnedSources.add(source);
  console.warn(DEPRECATION_WARNINGS[source]);
}

/**
 * Resolve the preview URL formatter from the `previewUrl` option, then from
 * `ARGOS_PREVIEW_BASE_URL`, warning once per process about each one in use:
 * both are deprecated in favour of reporting a deployment.
 */
export function getPreviewUrlFormatter(input: {
  /** The `previewUrl` upload option. */
  option: PreviewUrlFormatter | undefined;
  /** The value of `ARGOS_PREVIEW_BASE_URL`. */
  baseUrl: string | null;
}): PreviewUrlFormatter | null {
  if (input.option) {
    warnDeprecated("option");
  }
  if (input.baseUrl) {
    warnDeprecated("env");
  }
  if (input.option) {
    return input.option;
  }
  if (input.baseUrl) {
    return { baseUrl: input.baseUrl };
  }
  return null;
}

/**
 * Format the preview URL of a screenshot taken on `url`.
 */
export function formatPreviewUrl(
  url: string,
  formatter: PreviewUrlFormatter,
): string {
  if (typeof formatter === "function") {
    return formatter(url);
  }
  const urlObj = new URL(url);
  return new URL(
    urlObj.pathname + urlObj.search + urlObj.hash,
    formatter.baseUrl,
  ).href;
}
