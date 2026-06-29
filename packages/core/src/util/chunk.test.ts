import { describe, it, expect } from "vitest";
import { chunkBySize } from "./chunk";

describe("chunkBySize", () => {
  it("returns no chunk for an empty array", () => {
    expect(chunkBySize([], 100)).toEqual([]);
  });

  it("keeps items in a single chunk when they fit", () => {
    const items = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(chunkBySize(items, 1000)).toEqual([items]);
  });

  it("splits items into several chunks when they exceed the size", () => {
    // Each item serializes to `{"a":"xxxx"}` (11 bytes).
    const items = Array.from({ length: 5 }, () => ({ a: "xxxx" }));
    const chunks = chunkBySize(items, 25);
    // 25 bytes fits 2 items (22 bytes) but not 3 (33 bytes).
    expect(chunks.map((chunk) => chunk.length)).toEqual([2, 2, 1]);
    expect(chunks.flat()).toEqual(items);
  });

  it("gives an oversized item its own chunk", () => {
    const items = [{ a: "x" }, { a: "x".repeat(100) }, { a: "x" }];
    const chunks = chunkBySize(items, 20);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1, 1, 1]);
    expect(chunks.flat()).toEqual(items);
  });
});
