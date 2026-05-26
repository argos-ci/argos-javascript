import { afterEach, describe, expect, it, vi } from "vitest";
import { APIError, apiFetch } from "./fetch";

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
