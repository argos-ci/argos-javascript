import createFetchClient from "openapi-fetch";
import pRetry from "p-retry";
import { debug } from "./debug";
import type { paths, components } from "./schema";

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
    fetch: (input) => {
      return pRetry(
        async () => {
          const response = await fetch(input.clone());
          if (response.status >= 500) {
            throw new APIError("Internal Server Error");
          }
          return response;
        },
        {
          retries: 3,
          onFailedAttempt: (context) => {
            debug("API request failed", context.error.message);
            if (context.retriesLeft > 0) {
              debug(`Retrying API request... (${context.retriesLeft} left)`);
            }
          },
        },
      );
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
export function throwAPIError(error: components["schemas"]["Error"]): never {
  debug("API error", error);
  const detailMessage = error.details
    ?.map((detail) => detail.message)
    .join(", ");

  throw new APIError(
    detailMessage ? `${error.error}: ${detailMessage}` : error.error,
  );
}
