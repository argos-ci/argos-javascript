import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCaptureIndex,
  getTestRunKey,
  nextCaptureIndex,
  resetCaptureIndexes,
} from "./capture-index";

beforeEach(() => {
  resetCaptureIndexes();
});

describe("nextCaptureIndex", () => {
  it("numbers the captures of a test from 0", () => {
    expect(nextCaptureIndex("test")).toBe(0);
    expect(nextCaptureIndex("test")).toBe(1);
    expect(nextCaptureIndex("test")).toBe(2);
  });

  it("counts each test independently", () => {
    expect(nextCaptureIndex("a")).toBe(0);
    expect(nextCaptureIndex("b")).toBe(0);
    expect(nextCaptureIndex("a")).toBe(1);
  });

  it("starts over once a test run is cleared", () => {
    nextCaptureIndex("test");
    clearCaptureIndex("test");
    expect(nextCaptureIndex("test")).toBe(0);
  });
});

describe("getTestRunKey", () => {
  it("gives a retry its own counter", () => {
    const first = getTestRunKey({ id: "t1", retry: 0 });
    const retry = getTestRunKey({ id: "t1", retry: 1 });
    expect(first).not.toBe(retry);
    expect(nextCaptureIndex(first)).toBe(0);
    expect(nextCaptureIndex(retry)).toBe(0);
  });

  it("gives a repeat its own counter", () => {
    expect(getTestRunKey({ id: "t1", repeat: 0 })).not.toBe(
      getTestRunKey({ id: "t1", repeat: 1 }),
    );
  });

  it("falls back to the title path when there is no id", () => {
    expect(getTestRunKey({ titlePath: ["a.spec.ts", "checkout"] })).toBe(
      "a.spec.ts › checkout#0@0",
    );
  });

  it("treats missing retry and repeat as the first run", () => {
    expect(getTestRunKey({ id: "t1" })).toBe(
      getTestRunKey({ id: "t1", retry: 0, repeat: 0 }),
    );
  });
});
