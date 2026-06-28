import {
  APIError,
  createClient,
  throwAPIError,
  type ArgosAPIClient,
} from "@argos-ci/api-client";

/** Optional override for the API base URL (used in tests and dev). */
export function getApiBaseUrl(): string | undefined {
  return process.env["ARGOS_API_BASE_URL"];
}

/** Create an Argos API client authenticated with the given token. */
export function createApiClient(authToken?: string): ArgosAPIClient {
  return createClient({ authToken, baseUrl: getApiBaseUrl() });
}

/**
 * Unwrap an `openapi-fetch` result, returning its data or throwing a formatted
 * {@link APIError} when the request failed or returned an empty body.
 */
export function unwrap<T>(result: {
  data?: T | undefined;
  error?: unknown;
  response: Response;
}): T {
  // Discriminate on the response status, not on `error`: a failed request with
  // an empty body (e.g. a 403/404 from a proxy or CDN) leaves `error` as
  // `undefined` or `""`, and `formatAPIError` falls back to the HTTP status —
  // a far more useful message than "Unexpected empty response".
  if (!result.response.ok) {
    throwAPIError(result.error, result.response);
  }
  if (result.data === undefined || result.data === null) {
    throw new APIError("Unexpected empty response from API.", {
      status: result.response.status,
    });
  }
  return result.data;
}
