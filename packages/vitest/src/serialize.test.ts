import { describe, expect, it } from "vitest";
import { serializeSnapshot } from "./serialize";

describe("serializeSnapshot", () => {
  it("writes strings verbatim", () => {
    expect(serializeSnapshot("hello world")).toBe("hello world");
    // Multi-line strings are preserved as-is (no quoting).
    expect(serializeSnapshot("line 1\nline 2")).toBe("line 1\nline 2");
  });

  it("serializes objects with pretty-format", () => {
    const output = serializeSnapshot({ a: 1, b: [1, 2], c: "x" });
    expect(output).toBe(
      [
        "Object {",
        '  "a": 1,',
        '  "b": Array [',
        "    1,",
        "    2,",
        "  ],",
        '  "c": "x",',
        "}",
      ].join("\n"),
    );
  });

  it("produces a stable output for equal values", () => {
    const value = { z: 1, a: { nested: true } };
    expect(serializeSnapshot(value)).toBe(serializeSnapshot({ ...value }));
  });

  it("uses a custom serializer when provided", () => {
    const output = serializeSnapshot(
      { foo: "bar" },
      { serialize: (value) => JSON.stringify(value) },
    );
    expect(output).toBe('{"foo":"bar"}');
  });

  it("passes strings through the custom serializer too", () => {
    const output = serializeSnapshot("hello", {
      serialize: (value) => `custom:${value}`,
    });
    expect(output).toBe("custom:hello");
  });
});
