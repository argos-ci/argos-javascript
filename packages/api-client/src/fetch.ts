import pRetry from "p-retry";
import { debug } from "./debug";

const DEFAULT_TIMEOUT = 30_000;

export class APIError extends Error {
  constructor(message: string) {
    super(message);
  }
}

interface APIFetchOptions {
  fetch?: typeof fetch;
  minTimeout?: number;
  retries?: number;
  timeout?: number;
}

async function createRequestFactory(request: Request, timeout: number) {
  // Snapshot the body once so retries do not clone/tee the original Request.
  const body = request.body ? await request.arrayBuffer() : undefined;
  const headers = new Headers(request.headers);
  const requestId =
    headers.get("x-argos-request-id") ?? globalThis.crypto.randomUUID();

  return (retryAttempt: number) => {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("x-argos-request-id", requestId);
    requestHeaders.set("x-argos-retry-attempt", String(retryAttempt));

    return new Request(request.url, {
      body,
      cache: request.cache,
      credentials: request.credentials,
      headers: requestHeaders,
      integrity: request.integrity,
      keepalive: request.keepalive,
      method: request.method,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeout)]),
    });
  };
}

export async function apiFetch(input: Request, options: APIFetchOptions = {}) {
  input.signal.throwIfAborted();

  const fetchImpl = options.fetch ?? fetch;
  const createRequest = await createRequestFactory(
    input,
    options.timeout ?? DEFAULT_TIMEOUT,
  );

  return pRetry(
    async (attemptNumber) => {
      const response = await fetchImpl(createRequest(attemptNumber - 1));
      if (response.status >= 500) {
        throw new APIError(`Internal Server Error (${response.status})`);
      }
      return response;
    },
    {
      minTimeout: options.minTimeout,
      retries: options.retries ?? 3,
      shouldRetry: () => !input.signal.aborted,
      onFailedAttempt: (context) => {
        debug("API request failed", context.error.message);
        if (context.retriesLeft > 0) {
          debug(`Retrying API request... (${context.retriesLeft} left)`);
        }
      },
    },
  );
}
