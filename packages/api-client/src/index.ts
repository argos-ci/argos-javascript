import createFetchClient from "openapi-fetch";
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
export function throwAPIError(error: {
  error: string;
  details: {
    message: string;
  }[];
}): never {
  debug("API error", error);
  const detailMessage = error.details
    .map((detail) => detail.message)
    .join(", ");
  throw new APIError(`${error.error}: ${detailMessage}`);
}
