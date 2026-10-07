import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { devices } from "@playwright/test";
import type { FullConfig, FullProject } from "@playwright/test/reporter";
import ArgosReporter from "./reporter";

/**
 * Run the reporter's `onBegin` hook with a single project.
 */
function begin(project: Pick<FullProject, "name" | "use">) {
  const config = { projects: [project] } as FullConfig;
  new ArgosReporter({}).onBegin(config);
}

describe("ArgosReporter", () => {
  describe("launch options check", () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("does not warn for a Desktop Firefox project", () => {
      begin({ name: "firefox", use: { ...devices["Desktop Firefox"] } });
      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn for a Desktop Safari project", () => {
      begin({ name: "webkit", use: { ...devices["Desktop Safari"] } });
      expect(warn).not.toHaveBeenCalled();
    });

    it("warns for a Desktop Chrome project missing the recommended args", () => {
      begin({ name: "chromium", use: { ...devices["Desktop Chrome"] } });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Playwright project "chromium" is missing recommended launchOptions args: --disable-lcd-text, --font-render-hinting=none.',
        ),
      );
    });

    it("warns for a project with no browser set", () => {
      // Playwright creates a single unnamed project when the config has none.
      begin({ name: "", use: {} });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Playwright project "default" is missing'),
      );
    });

    it("lets `browserName` take precedence over the device preset", () => {
      // `--browser=chromium` on a config that uses `devices["Desktop Firefox"]`
      // runs Chromium.
      begin({
        name: "chromium",
        use: { ...devices["Desktop Firefox"], browserName: "chromium" },
      });
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
