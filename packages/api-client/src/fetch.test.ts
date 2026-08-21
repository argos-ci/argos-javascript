import { afterEach, describe, expect, it, vi } from "vitest";
import { APIError, apiFetch } from "./fetch";

function rateLimitResponse(retryAfter: string | null = "0") {
  return new Response("rate limited", {
    status: 429,
    headers: retryAfter === null ? undefined : { "retry-after": retryAfter },
  });
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries server errors with a fresh request and replays the body", async () => {
    const cloneSpy = vi
      .spyOn(Request.prototype, "clone")
      .mockImplementation(() => {
        throw new TypeError("unusable");
      });
    const bodies: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      bodies.push(await request.text());

      return new Response("{}", {
        status: bodies.length === 1 ? 500 : 200,
      });
    });
    const body = JSON.stringify({ commit: "abc123" });
    const request = new Request("https://api.argos-ci.test/builds", {
      body,
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    const response = await apiFetch(request, {
      fetch: fetchMock as unknown as typeof fetch,
      minTimeout: 0,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodies).toEqual([body, body]);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it("does not retry client errors", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 400 }));

    const response = await apiFetch(
      new Request("https://api.argos-ci.test/builds"),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
      },
    );

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries rate limits after Retry-After plus jitter", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitResponse("2"))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const responsePromise = apiFetch(
      new Request("https://api.argos-ci.test/builds"),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
      },
    );

    await vi.advanceTimersByTimeAsync(2_499);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["missing", null, 60_000],
    ["invalid", "later", 60_000],
    ["too large", "600", 300_000],
  ])(
    "bounds the retry delay when Retry-After is %s",
    async (_case, retryAfter, expectedDelay) => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(rateLimitResponse(retryAfter))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      const responsePromise = apiFetch(
        new Request("https://api.argos-ci.test/builds"),
        {
          fetch: fetchMock as unknown as typeof fetch,
          minTimeout: 0,
        },
      );

      await vi.advanceTimersByTimeAsync(expectedDelay - 1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await expect(responsePromise).resolves.toMatchObject({ status: 200 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("returns the final rate limit response after retries are exhausted", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchMock = vi.fn(async () => rateLimitResponse());

    const responsePromise = apiFetch(
      new Request("https://api.argos-ci.test/builds"),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
        retries: 2,
      },
    );

    await vi.runAllTimersAsync();
    const response = await responsePromise;
    expect(response.status).toBe(429);
    await expect(response.text()).resolves.toBe("rate limited");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("preserves caller cancellation during a rate limit delay", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const controller = new AbortController();
    const reason = new Error("cancelled by caller");
    const fetchMock = vi.fn(async () => rateLimitResponse("60"));

    const promise = apiFetch(
      new Request("https://api.argos-ci.test/builds", {
        signal: controller.signal,
      }),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
      },
    );

    await vi.advanceTimersByTimeAsync(0);
    controller.abort(reason);

    await expect(promise).rejects.toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws APIError after server error retries are exhausted", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 503 }));

    const promise = apiFetch(new Request("https://api.argos-ci.test/builds"), {
      fetch: fetchMock as unknown as typeof fetch,
      minTimeout: 0,
      retries: 1,
    });

    await expect(promise).rejects.toThrow(APIError);
    await expect(promise).rejects.toThrow("Internal Server Error (503)");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("adds stable request id and increments retry attempt headers", async () => {
    const requestIds: string[] = [];
    const retryAttempts: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      requestIds.push(request.headers.get("x-argos-request-id") ?? "");
      retryAttempts.push(request.headers.get("x-argos-retry-attempt") ?? "");

      return new Response("{}", {
        status: requestIds.length === 1 ? 500 : 200,
      });
    });

    const response = await apiFetch(
      new Request("https://api.argos-ci.test/builds"),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
      },
    );

    expect(response.status).toBe(200);
    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).toBeTruthy();
    expect(requestIds[0]).toBe(requestIds[1]);
    expect(retryAttempts).toEqual(["0", "1"]);
  });

  it("aborts the request after the configured timeout", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL) =>
        new Promise<Response>((_resolve, reject) => {
          const request = input instanceof Request ? input : new Request(input);
          if (request.signal.aborted) {
            reject(request.signal.reason);
            return;
          }
          request.signal.addEventListener(
            "abort",
            () => reject(request.signal.reason),
            { once: true },
          );
        }),
    );

    await expect(
      apiFetch(new Request("https://api.argos-ci.test/builds"), {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
        retries: 0,
        timeout: 1,
      }),
    ).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves caller cancellation signal", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled by caller");
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL) =>
        new Promise<Response>((_resolve, reject) => {
          const request = input instanceof Request ? input : new Request(input);
          if (request.signal.aborted) {
            reject(request.signal.reason);
            return;
          }
          request.signal.addEventListener(
            "abort",
            () => reject(request.signal.reason),
            { once: true },
          );
        }),
    );

    const promise = apiFetch(
      new Request("https://api.argos-ci.test/builds", {
        signal: controller.signal,
      }),
      {
        fetch: fetchMock as unknown as typeof fetch,
        minTimeout: 0,
      },
    );
    const rejection = promise.catch((error: unknown) => error);

    controller.abort(reason);

    await expect(rejection).resolves.toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call fetch when the caller signal is already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("already cancelled");
    const fetchMock = vi.fn(async () => new Response("{}"));

    controller.abort(reason);

    await expect(
      apiFetch(
        new Request("https://api.argos-ci.test/builds", {
          signal: controller.signal,
        }),
        {
          fetch: fetchMock as unknown as typeof fetch,
        },
      ),
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
