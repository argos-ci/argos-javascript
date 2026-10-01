import pRetry from "p-retry";
import { debug } from "./debug";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MIN_TIMEOUT = 1_000;

/**
 * A request the API rejects with `429 Too Many Requests` is retried up to
 * `MAX_RATE_LIMIT_RETRIES` times, apart from the retries for server errors,
 * waiting at most `MAX_RATE_LIMIT_DELAY` before each retry whatever
 * `Retry-After` asks. The API counts requests in fixed 5-minute windows, so
 * five waits of a minute see a request through a whole window, and rate
 * limiting never holds a request up for more than five minutes.
 */
const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_RATE_LIMIT_DELAY = 60_000;

export class APIError extends Error {
  /**
   * HTTP status code of the response that triggered the error, when available.
   */
  status?: number;

  /**
   * Raw error payload returned by the API (or the infrastructure in front of
   * it). Useful when the body does not match the expected error shape.
   */
  data?: unknown;

  constructor(
    message: string,
    options?: { status?: number; data?: unknown; cause?: unknown },
  ) {
    super(
      message,
      options?.cause != null ? { cause: options.cause } : undefined,
    );
    this.name = "APIError";
    this.status = options?.status;
    this.data = options?.data;
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
  const existingRequestId = headers.get("x-argos-request-id")?.trim();
  const requestId = existingRequestId || globalThis.crypto.randomUUID();

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

/**
 * Get how long to wait before retrying a `429 Too Many Requests` response: its
 * `Retry-After`, or exponential backoff from `minTimeout` when the header is
 * missing or invalid. The API sends a number of seconds; any other value, an
 * HTTP date included, counts as invalid.
 */
function getRateLimitDelay(
  response: Response,
  minTimeout: number,
  retry: number,
): number {
  const retryAfter = response.headers.get("retry-after")?.trim() ?? "";
  const delay = /^\d+$/.test(retryAfter)
    ? Number(retryAfter) * 1000
    : minTimeout * 2 ** retry;
  return Math.min(delay, MAX_RATE_LIMIT_DELAY);
}

/**
 * Wait for `ms`, or reject with the signal's reason as soon as it aborts.
 */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function apiFetch(input: Request, options: APIFetchOptions = {}) {
  input.signal.throwIfAborted();

  const fetchImpl = options.fetch ?? fetch;
  const minTimeout = options.minTimeout ?? DEFAULT_MIN_TIMEOUT;
  const createRequest = await createRequestFactory(
    input,
    options.timeout ?? DEFAULT_TIMEOUT,
  );

  // Both counters span the whole call: `x-argos-retry-attempt` counts every
  // retry, of either kind, and the 429 retries stay bounded across server
  // error retries.
  let retryAttempt = 0;
  let rateLimitRetries = 0;
  const send = () => fetchImpl(createRequest(retryAttempt++));

  return pRetry(
    async () => {
      let response = await send();
      // Retried here rather than by p-retry, so the wait follows `Retry-After`
      // and does not use up the retries for server errors. Once the 429
      // retries run out, the last 429 is returned as is, for the caller to
      // report.
      while (
        response.status === 429 &&
        rateLimitRetries < MAX_RATE_LIMIT_RETRIES
      ) {
        const delay = getRateLimitDelay(response, minTimeout, rateLimitRetries);
        debug(
          `API request rate limited, retrying in ${delay}ms (${MAX_RATE_LIMIT_RETRIES - rateLimitRetries} left)`,
        );
        rateLimitRetries++;
        // Free the connection rather than holding it through the wait.
        await response.body?.cancel();
        await wait(delay, input.signal);
        response = await send();
      }
      if (response.status >= 500) {
        throw new APIError(`Internal Server Error (${response.status})`);
      }
      return response;
    },
    {
      minTimeout,
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
