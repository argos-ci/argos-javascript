import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserCommandContext } from "vitest/node";

const { argosScreenshot, setMetadataConfig } = vi.hoisted(() => ({
  argosScreenshot: vi.fn(),
  setMetadataConfig: vi.fn(),
}));

vi.mock("@argos-ci/playwright", () => ({
  argosScreenshot,
  DO_NOT_USE_setMetadataConfig: setMetadataConfig,
}));

vi.mock("./version", () => ({
  getArgosVitestVersion: vi.fn().mockResolvedValue("0.0.0-test"),
}));

import { createArgosScreenshotCommand } from "./command";

function createCtx() {
  const evaluate = vi.fn().mockResolvedValue(undefined);
  const frame = { __brand: "frame" };
  const ctx = {
    page: { evaluate },
    frame: vi.fn().mockResolvedValue(frame),
  } as unknown as BrowserCommandContext;
  return { ctx, evaluate, frame };
}

describe("createArgosScreenshotCommand", () => {
  beforeEach(() => {
    argosScreenshot.mockReset().mockResolvedValue([
      { name: "argos-screenshot", contentType: "image/png", path: "/x.png" },
      {
        name: "argos-screenshot/metadata",
        contentType: "application/json",
        path: "/x.json",
      },
    ]);
    setMetadataConfig.mockReset();
  });

  it("throws when the name is missing", async () => {
    const command = createArgosScreenshotCommand();
    const { ctx } = createCtx();
    await expect(command(ctx, "")).rejects.toThrow("name");
  });

  it("merges per-call options over plugin defaults and preserves node-only hooks", async () => {
    const pluginBeforeScreenshot = vi.fn();
    const command = createArgosScreenshotCommand({
      element: "#plugin-default",
      threshold: 0.9,
      beforeScreenshot: pluginBeforeScreenshot,
    });
    const { ctx, frame } = createCtx();

    await command(ctx, "shot", { element: "#per-call" });

    expect(argosScreenshot).toHaveBeenCalledTimes(1);
    const [passedFrame, name, opts] = argosScreenshot.mock.calls[0]!;
    expect(passedFrame).toBe(frame);
    expect(name).toBe("shot");
    // Per-call option wins over the plugin default.
    expect(opts.element).toBe("#per-call");
    // Plugin-only (node-side) option is preserved.
    expect(opts.threshold).toBe(0.9);
    // Vitest-specific options are stripped before reaching Playwright.
    expect(opts.viewports).toBeUndefined();
    expect(opts.fullPage).toBeUndefined();
    // The node-only hook is wrapped, not dropped: invoking it runs the plugin hook.
    expect(typeof opts.beforeScreenshot).toBe("function");
    await opts.beforeScreenshot({ runStabilization: vi.fn() });
    expect(pluginBeforeScreenshot).toHaveBeenCalledTimes(1);
  });

  it("sets the Argos SDK metadata before capturing", async () => {
    const command = createArgosScreenshotCommand();
    const { ctx } = createCtx();

    await command(ctx, "shot");

    expect(setMetadataConfig).toHaveBeenCalled();
    const metadata = setMetadataConfig.mock.calls.at(-1)![0];
    expect(metadata.sdk).toEqual({
      name: "@argos-ci/vitest",
      version: "0.0.0-test",
    });
    expect(metadata.playwrightLibraries).toContain(
      "@vitest/browser-playwright",
    );
  });

  it("takes one screenshot per viewport with viewport-suffixed names", async () => {
    const command = createArgosScreenshotCommand();
    const { ctx } = createCtx();

    const attachments = await command(ctx, "resp", {
      viewports: [
        { width: 320, height: 480 },
        { width: 1280, height: 800 },
      ],
    });

    expect(argosScreenshot).toHaveBeenCalledTimes(2);
    const names = argosScreenshot.mock.calls.map((call) => call[1]);
    expect(names).toEqual(["resp vw-320", "resp vw-1280"]);
    // Each viewport records its size in the metadata.
    const viewports = setMetadataConfig.mock.calls.map(
      (call) => call[0].viewport,
    );
    expect(viewports).toContainEqual({ width: 320, height: 480 });
    expect(viewports).toContainEqual({ width: 1280, height: 800 });
    // Attachments from every viewport are returned.
    expect(attachments).toHaveLength(4);
  });
});
