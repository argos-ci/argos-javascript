import createDebug from "debug";
import { describe, expect, it, vi } from "vitest";
import { debug } from "./debug";

/** Run `log` with the namespace enabled and return what it wrote to stderr. */
function captureDebugOutput(log: () => void): string {
  const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  createDebug.enable("@argos-ci/core");
  try {
    log();
    return write.mock.calls.map(([chunk]) => String(chunk)).join("");
  } finally {
    createDebug.disable();
    write.mockRestore();
  }
}

describe("debug", () => {
  it("never prints a token it is handed (GHSA-28pg-v3hp-9g7f)", () => {
    const output = captureDebugOutput(() => {
      debug("Starting upload with params", {
        token: "a".repeat(40),
        commit: "0".repeat(40),
      });
    });

    expect(output).toContain("Starting upload with params");
    expect(output).toContain("[redacted]");
    expect(output).not.toContain("a".repeat(40));
    // The rest of the object is still there to debug with.
    expect(output).toContain("0".repeat(40));
  });

  it("writes nothing when the namespace is disabled", () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      debug("Starting upload with params", { token: "a".repeat(40) });
      expect(write).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
    }
  });
});
