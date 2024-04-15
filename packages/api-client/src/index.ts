import createFetchClient from "openapi-fetch";
import type { paths } from "./schema";

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
