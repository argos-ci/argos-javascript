import { describe, expect, it } from "vitest";
import { parseAnchor } from "./anchor";
import { CliError } from "./cli-error";

describe("parseAnchor", () => {
  it("returns undefined when no anchor is given", () => {
    expect(parseAnchor({})).toBeUndefined();
  });

  it("parses a normalized point", () => {
    expect(parseAnchor({ anchorPoint: "0.5,0.25" })).toEqual({
      type: "point",
      x: 0.5,
      y: 0.25,
    });
  });

  it("tolerates whitespace around point coordinates", () => {
    expect(parseAnchor({ anchorPoint: " 0, 1 " })).toEqual({
      type: "point",
      x: 0,
      y: 1,
    });
  });

  it("rejects out-of-range point coordinates", () => {
    expect(() => parseAnchor({ anchorPoint: "1.5,0" })).toThrow(CliError);
    expect(() => parseAnchor({ anchorPoint: "0,-0.1" })).toThrow(
      /between 0 and 1/,
    );
  });

  it("rejects malformed point input", () => {
    expect(() => parseAnchor({ anchorPoint: "0.5" })).toThrow(/two numbers/);
    expect(() => parseAnchor({ anchorPoint: "a,b" })).toThrow(/two numbers/);
  });

  it("parses a 1-based line range", () => {
    expect(parseAnchor({ anchorLines: "10,20" })).toEqual({
      type: "lines",
      from: 10,
      to: 20,
    });
  });

  it("rejects invalid line ranges", () => {
    expect(() => parseAnchor({ anchorLines: "0,5" })).toThrow(/1-based/);
    expect(() => parseAnchor({ anchorLines: "5,2" })).toThrow(/from <= to/);
    expect(() => parseAnchor({ anchorLines: "1.5,2" })).toThrow(CliError);
  });

  it("rejects providing both anchor forms", () => {
    expect(() =>
      parseAnchor({ anchorPoint: "0.5,0.5", anchorLines: "1,2" }),
    ).toThrow(/not both/);
  });
});
