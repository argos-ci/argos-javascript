import createFetchClient from "openapi-fetch";
import { debug } from "./debug";
import { apiFetch, APIError } from "./fetch";
import type { paths, components } from "./schema";

export * as ArgosAPISchema from "./schema";
export { APIError } from "./fetch";

export type ArgosAPIClient = ReturnType<typeof createClient>;

/**
 * Create Argos API client.
 */
export function createClient(options?: {
  baseUrl?: string;
  authToken?: string;
}) {
  const { baseUrl, authToken } = options || {};
  return createFetchClient<paths>({
    baseUrl: baseUrl || "https://api.argos-ci.com/v2/",
    headers: {
      Authorization: authToken ? `Bearer ${authToken}` : undefined,
    },
    fetch: apiFetch,
  });
}

/**
 * Handle API errors.
 */
export function formatAPIError(error: components["schemas"]["Error"]): string {
  debug("API error", error);
  const detailMessage = error.details
    ?.map((detail) => detail.message)
    .join(", ");

  return detailMessage ? `${error.error}: ${detailMessage}` : error.error;
}

/**
 * Handle API errors.
 */
export function throwAPIError(error: components["schemas"]["Error"]): never {
  throw new APIError(formatAPIError(error));
}
