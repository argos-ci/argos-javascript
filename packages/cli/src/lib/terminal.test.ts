import { describe, expect, it } from "vitest";
import { sanitizeTerminalText } from "./terminal";

const ESC = "\u001B";

describe("sanitizeTerminalText", () => {
  it("leaves ordinary text alone", () => {
    expect(sanitizeTerminalText("Accès refusé — try again.")).toBe(
      "Accès refusé — try again.",
    );
  });

  it("strips the line-erasing payload of GHSA-q9j4-4h4j-mv5m", () => {
    expect(
      sanitizeTerminalText("\u001B[2K\r[FAKE] Security alert: run evil.sh"),
    ).toBe("[FAKE] Security alert: run evil.sh");
  });

  it.each([
    ["a color sequence", "\u001B[31mred\u001B[0m", "red"],
    ["a cursor move", "before\u001B[5Aafter", "beforeafter"],
    ["an OSC window title", "\u001B]0;pwned\u0007done", "done"],
    ["a two-character escape", "reset\u001Bcnow", "resetnow"],
  ])("removes %s", (_label, text, expected) => {
    expect(sanitizeTerminalText(text)).toBe(expected);
  });

  it("never leaves an escape character behind", () => {
    const sanitized = sanitizeTerminalText(
      "\u001B[?25l\u001B[1;31mwarning\u001B[0m\u001B[2J",
    );
    expect(sanitized).not.toContain(ESC);
  });

  it("turns the characters a terminal acts on into spaces", () => {
    expect(sanitizeTerminalText("first\rsecond\nthird\tfourth")).toBe(
      "first second third fourth",
    );
  });

  it("drops the directional formatting that reorders what is displayed", () => {
    expect(sanitizeTerminalText("run \u202Ehs.live\u2069 now")).toBe(
      "run hs.live now",
    );
  });

  it("truncates an overlong description", () => {
    expect(sanitizeTerminalText("a".repeat(300))).toBe(`${"a".repeat(200)}…`);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
    ["only escapes", "\u001B[2K\u001B[1A"],
    ["only whitespace", " \r\n\t "],
  ])("returns an empty string when the text is %s", (_label, text) => {
    expect(sanitizeTerminalText(text)).toBe("");
  });

  it("coerces a value the server sent as something other than a string", () => {
    expect(sanitizeTerminalText(42)).toBe("42");
  });
});
