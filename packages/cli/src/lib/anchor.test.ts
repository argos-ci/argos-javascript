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
    expect(() => parseAnchor({ anchorPoint: "0.5," })).toThrow(/two numbers/);
  });

  it("parses a normalized area", () => {
    expect(parseAnchor({ anchorArea: "0.1, 0.2, 0.3, 0.25" })).toEqual({
      type: "area",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.25,
    });
  });

  it("accepts an area that reaches the edge of the image", () => {
    expect(parseAnchor({ anchorArea: "0,0,1,1" })).toEqual({
      type: "area",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    // x + width is 1.0000000000000002 in floating point.
    expect(
      parseAnchor({ anchorArea: "0.1,0,0.9000000000000001,1" }),
    ).toMatchObject({ type: "area" });
  });

  it("rejects malformed area input", () => {
    expect(() => parseAnchor({ anchorArea: "0.1,0.2,0.3" })).toThrow(
      /four numbers/,
    );
    expect(() => parseAnchor({ anchorArea: "0.1,0.2,0.3," })).toThrow(
      /four numbers/,
    );
    expect(() => parseAnchor({ anchorArea: "0.1,0.2,a,0.3" })).toThrow(
      /four numbers/,
    );
  });

  it("rejects out-of-range area values", () => {
    expect(() => parseAnchor({ anchorArea: "-0.1,0,0.5,0.5" })).toThrow(
      /between 0 and 1/,
    );
    expect(() => parseAnchor({ anchorArea: "0,0,1.5,0.5" })).toThrow(
      /between 0 and 1/,
    );
  });

  it("rejects an empty area", () => {
    expect(() => parseAnchor({ anchorArea: "0.1,0.1,0,0.5" })).toThrow(
      /greater than 0/,
    );
    expect(() => parseAnchor({ anchorArea: "0.1,0.1,0.5,0" })).toThrow(
      /greater than 0/,
    );
  });

  it("rejects an area past the edge of the image", () => {
    expect(() => parseAnchor({ anchorArea: "0.8,0,0.3,0.5" })).toThrow(
      /past the edge/,
    );
    expect(() => parseAnchor({ anchorArea: "0,0.6,0.5,0.5" })).toThrow(
      /past the edge/,
    );
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

  it("rejects combining anchor forms", () => {
    expect(() =>
      parseAnchor({ anchorPoint: "0.5,0.5", anchorLines: "1,2" }),
    ).toThrow("--anchor-point and --anchor-lines cannot be combined.");
    expect(() =>
      parseAnchor({ anchorPoint: "0.5,0.5", anchorArea: "0,0,0.5,0.5" }),
    ).toThrow("--anchor-point and --anchor-area cannot be combined.");
    expect(() =>
      parseAnchor({
        anchorPoint: "0.5,0.5",
        anchorArea: "0,0,0.5,0.5",
        anchorLines: "1,2",
      }),
    ).toThrow(
      "--anchor-point, --anchor-area and --anchor-lines cannot be combined.",
    );
  });
});
