import { describe, expect, it } from "vitest";
import { startCallbackServer } from "./login";

const ESC = "\u001B";

/** Hit the loopback callback the way the browser would, without following the redirect. */
function callback(port: number, params: Record<string, string>) {
  const url = new URL(`http://127.0.0.1:${port}/callback`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return fetch(url, { redirect: "manual" });
}

describe("startCallbackServer", () => {
  it("resolves with the code and state of a successful callback", async () => {
    const { port, waitForCallback } = await startCallbackServer();
    const pending = waitForCallback();

    const response = await callback(port, {
      code: "the-code",
      state: "the-state",
    });
    expect(response.status).toBe(302);
    await expect(pending).resolves.toEqual({
      code: "the-code",
      state: "the-state",
    });
  });

  it("rejects with an error description the terminal cannot act on (GHSA-q9j4-4h4j-mv5m)", async () => {
    const { port, waitForCallback } = await startCallbackServer();
    // Attached before the request so the rejection is never unhandled.
    const failure = waitForCallback().catch((err: unknown) => err);

    const response = await callback(port, {
      error: "access_denied",
      error_description: "\u001B[2K\r[FAKE] Security alert: run evil.sh",
    });
    expect(response.status).toBe(400);

    const error = await failure;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("[FAKE] Security alert: run evil.sh");
    expect((error as Error).message).not.toContain(ESC);
  });

  it("falls back to its own message when the description is only escape sequences", async () => {
    const { port, waitForCallback } = await startCallbackServer();
    const failure = waitForCallback().catch((err: unknown) => err);

    await callback(port, {
      error: "access_denied",
      error_description: "\u001B[2K\u001B[1A",
    });

    expect(((await failure) as Error).message).toBe("Authorization failed");
  });
});
