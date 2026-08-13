import createFetchClient from "openapi-fetch";
import { debug } from "./debug";
import { apiFetch, APIError } from "./fetch";
import type { paths, components } from "./schema";

export * as ArgosAPISchema from "./schema";
export { APIError } from "./fetch";

export type ArgosAPIClient = ReturnType<typeof createClient>;

/**
 * A `User-Agent` value, or a resolver for it. The resolver may be async and is
 * called per request, so a caller that only learns its identity asynchronously
 * (the CLI detecting the coding agent driving it) does not have to await that
 * before it can build a client.
 */
export type UserAgentOption =
  string | (() => string | undefined | Promise<string | undefined>);

/**
 * Wrap {@link apiFetch} so every request carries a `User-Agent`.
 *
 * The header is set on the request openapi-fetch just built for this call — no
 * one else observes it — and `apiFetch` copies the headers before retrying, so
 * every attempt keeps the value.
 */
function createUserAgentFetch(userAgent: UserAgentOption): typeof apiFetch {
  return async (input, options) => {
    const value =
      typeof userAgent === "function" ? await userAgent() : userAgent;
    if (value) {
      input.headers.set("user-agent", value);
    }
    return apiFetch(input, options);
  };
}

/**
 * Create Argos API client.
 */
export function createClient(options?: {
  baseUrl?: string;
  authToken?: string;
  userAgent?: UserAgentOption;
}) {
  const { baseUrl, authToken, userAgent } = options || {};
  return createFetchClient<paths>({
    baseUrl: baseUrl || "https://api.argos-ci.com/v2/",
    headers: {
      Authorization: authToken ? `Bearer ${authToken}` : undefined,
    },
    fetch: userAgent ? createUserAgentFetch(userAgent) : apiFetch,
  });
}

/**
 * Maximum length of a raw error body included in the formatted message.
 * Keeps things readable when the body is an HTML error page or a stack trace.
 */
const MAX_RAW_BODY_LENGTH = 500;

/**
 * Check whether the value matches the expected API error shape:
 * `{ error: string, details?: [{ message }] }`.
 */
function isStructuredAPIError(
  error: unknown,
): error is components["schemas"]["Error"] {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "string" &&
    (error as { error: string }).error.length > 0
  );
}

/**
 * Format the HTTP status of a response, e.g. `HTTP 413 Payload Too Large`.
 */
function formatStatus(response: Response | undefined): string | null {
  if (!response) {
    return null;
  }
  return response.statusText
    ? `HTTP ${response.status} ${response.statusText}`
    : `HTTP ${response.status}`;
}

/**
 * Format a raw (non-structured) error body so it can be shown to the user.
 * Returns `null` when there is nothing meaningful to display.
 */
function formatRawBody(error: unknown): string | null {
  if (error == null) {
    return null;
  }
  let text: string;
  if (typeof error === "string") {
    text = error;
  } else {
    try {
      text = JSON.stringify(error);
    } catch {
      text = String(error);
    }
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed === "{}") {
    return null;
  }
  return trimmed.length > MAX_RAW_BODY_LENGTH
    ? `${trimmed.slice(0, MAX_RAW_BODY_LENGTH)}…`
    : trimmed;
}

/**
 * Format an API error into a human-readable message.
 *
 * When the body matches the expected `{ error, details }` shape, it is used
 * directly. Otherwise — empty body, HTML error page, plain text, etc., which
 * happens when the response comes from infrastructure in front of the API
 * (proxy, load balancer, CDN, rate limiter) rather than from the API itself —
 * we fall back to the HTTP status and the raw body so the failure stays
 * debuggable instead of surfacing an empty message.
 */
export function formatAPIError(error: unknown, response?: Response): string {
  debug("API error", { error, status: response?.status });

  if (isStructuredAPIError(error)) {
    const detailMessage = error.details
      ?.map((detail) => detail.message)
      .join(", ");

    return detailMessage ? `${error.error}: ${detailMessage}` : error.error;
  }

  const message = [formatStatus(response), formatRawBody(error)]
    .filter(Boolean)
    .join(": ");

  return message || "Unknown API error";
}

/**
 * Handle API errors.
 */
export function throwAPIError(error: unknown, response?: Response): never {
  throw new APIError(formatAPIError(error, response), {
    status: response?.status,
    data: error,
  });
}
