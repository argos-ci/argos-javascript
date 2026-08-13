import { describe, expect, it } from "vitest";
import { formatUserAgent } from "./user-agent";

const NODE = `node/${process.versions.node}`;

describe("formatUserAgent", () => {
  it("identifies the CLI and the runtime", () => {
    expect(formatUserAgent({ version: "6.7.0" })).toBe(
      `argos-cli/6.7.0 ${NODE}`,
    );
  });

  it("appends the agent when one drives the CLI", () => {
    expect(formatUserAgent({ version: "6.7.0", agent: "claude" })).toBe(
      `argos-cli/6.7.0 ${NODE} agent/claude`,
    );
  });

  it.each([
    ["Claude Code", "claude-code"],
    ["  cursor-cli  ", "cursor-cli"],
    ["custom-agent@2.0", "custom-agent@2.0"],
    ["MyAgent/1.0", "myagent-1.0"],
    ["évadé", "vad"],
  ])("normalizes %j into a header token", (agent, expected) => {
    expect(formatUserAgent({ version: "6.7.0", agent })).toBe(
      `argos-cli/6.7.0 ${NODE} agent/${expected}`,
    );
  });

  it("truncates an overlong agent name", () => {
    const agent = "a".repeat(200);
    expect(formatUserAgent({ version: "6.7.0", agent })).toBe(
      `argos-cli/6.7.0 ${NODE} agent/${"a".repeat(64)}`,
    );
  });

  it.each([
    ["not set", undefined],
    ["null", null],
    ["empty", ""],
    ["only separators", " -- "],
    ["nothing usable", "🤖"],
  ])("omits the agent token when it is %s", (_label, agent) => {
    expect(formatUserAgent({ version: "6.7.0", agent })).toBe(
      `argos-cli/6.7.0 ${NODE}`,
    );
  });

  it("never emits a value that could inject a header", () => {
    const agent = "evil\r\nX-Injected: 1";
    expect(formatUserAgent({ version: "6.7.0", agent })).toBe(
      `argos-cli/6.7.0 ${NODE} agent/evil-x-injected-1`,
    );
  });
});
