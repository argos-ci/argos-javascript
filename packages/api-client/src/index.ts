import createFetchClient, { FetchResponse } from "openapi-fetch";
import { debug } from "./debug";
import type { paths } from "./schema";

export * as ArgosAPISchema from "./schema";

export type ArgosAPIClient = ReturnType<typeof createClient>;

/**
 * Create Argos API client.
 */
export function createClient(options: { baseUrl?: string; authToken: string }) {
  const { baseUrl } = options || {};
  return createFetchClient<paths>({
    baseUrl: baseUrl || "https://api.argos-ci.com/v2/",
    headers: {
      Authorization: `Bearer ${options.authToken}`,
    },
  });
}

export class APIError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Handle API errors.
 */
export function throwAPIError(
  fetchResponse: FetchResponse<any, any, any>,
): never {
  const { error, response } = fetchResponse;
  if (
    error &&
    typeof error === "object" &&
    "error" in error &&
    typeof error.error === "string"
  ) {
    debug("API error", error);
    // Print the first validation error message if present.
    const message = error.details?.[0]?.message;
    if (typeof message === "string") {
      throw new APIError(`${error.error}: ${message}`);
    }
    throw new APIError(error.error);
  }
  throw new APIError(`API error: ${response.status} ${response.statusText}`);
}
