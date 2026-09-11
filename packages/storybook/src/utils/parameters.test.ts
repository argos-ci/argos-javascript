import { describe, expect, it } from "vitest";
import { getDefaultViewport, getViewport } from "./parameters";

const definitions = {
  compact: {
    name: "Compact",
    styles: { width: "600px", height: "900px" },
  },
  widescreen: {
    name: "Widescreen",
    styles: { width: "1440px", height: "900px" },
  },
};

describe("getViewport", () => {
  it("resolves a viewport name from `viewport.options` (Storybook 9+)", () => {
    expect(
      getViewport({ viewport: { options: definitions } }, "compact"),
    ).toEqual({ width: 600, height: 900 });
  });

  it("resolves a viewport name from the legacy `viewport.viewports`", () => {
    expect(
      getViewport({ viewport: { viewports: definitions } }, "compact"),
    ).toEqual({ width: 600, height: 900 });
  });

  it("prefers `options` over `viewports` when both are defined", () => {
    const parameters = {
      viewport: {
        options: definitions,
        viewports: {
          compact: { name: "Old", styles: { width: "1px", height: "1px" } },
        },
      },
    };
    expect(getViewport(parameters, "compact")).toEqual({
      width: 600,
      height: 900,
    });
  });

  it("accepts the Storybook 9+ `{ value, isRotated }` global", () => {
    const parameters = { viewport: { options: definitions } };
    expect(getViewport(parameters, { value: "compact" })).toEqual({
      width: 600,
      height: 900,
    });
    expect(
      getViewport(parameters, { value: "compact", isRotated: true }),
    ).toEqual({ width: 900, height: 600 });
  });

  it("uses a number as the viewport width", () => {
    expect(getViewport({}, 800)).toEqual({ width: 800, height: 720 });
    expect(getViewport({}, { value: 800 })).toEqual({
      width: 800,
      height: 720,
    });
  });

  it("returns null for the responsive viewport, unknown names or no global", () => {
    const parameters = { viewport: { options: definitions } };
    expect(getViewport(parameters, { value: undefined })).toBeNull();
    expect(getViewport(parameters, "unknown")).toBeNull();
    expect(getViewport(parameters, undefined)).toBeNull();
    expect(getViewport(parameters, null)).toBeNull();
    expect(getViewport({}, "compact")).toBeNull();
  });
});

describe("getDefaultViewport", () => {
  it("reads the legacy `viewport.defaultViewport` parameter", () => {
    expect(
      getDefaultViewport({
        viewport: { viewports: definitions, defaultViewport: "widescreen" },
      }),
    ).toEqual({ width: 1440, height: 900 });
  });

  it("rotates the legacy default when `defaultOrientation` is landscape", () => {
    expect(
      getDefaultViewport({
        viewport: {
          options: definitions,
          defaultViewport: "compact",
          defaultOrientation: "landscape",
        },
      }),
    ).toEqual({ width: 900, height: 600 });
  });

  it("returns null without a legacy default", () => {
    expect(
      getDefaultViewport({ viewport: { options: definitions } }),
    ).toBeNull();
    expect(getDefaultViewport({})).toBeNull();
  });
});
