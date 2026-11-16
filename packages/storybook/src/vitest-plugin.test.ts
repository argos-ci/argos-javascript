import { describe, expect, it } from "vitest";
import { ArgosReporter } from "@argos-ci/vitest/plugin";
import { argosVitestPlugin } from "./vitest-plugin";

const USER_SETUP_FILE = "/project/.storybook/vitest.setup.ts";

/**
 * Run the plugin's `configureVitest` hook for `projects` projects of the same
 * Vitest run, the way Vitest does for each browser of `browser.instances`.
 */
function configure(
  options: { uploadToArgos?: boolean; projects?: number } = {},
) {
  const { uploadToArgos = false, projects = 1 } = options;
  const plugin = argosVitestPlugin({ uploadToArgos }) as any;
  const vitest = { config: { reporters: [] as unknown[] } };
  // Each project has its own setup files; all of them end up the same.
  let setupFiles: string[] = [];
  for (let index = 0; index < projects; index++) {
    setupFiles = [USER_SETUP_FILE];
    plugin.configureVitest({ vitest, project: { config: { setupFiles } } });
  }
  return { setupFiles, reporters: vitest.config.reporters };
}

describe("argosVitestPlugin", () => {
  it("registers the channel setup ahead of the user's setup files", () => {
    const { setupFiles } = configure();

    // Addon preview modules capture a channel when the user's setup file
    // imports them, so ours has to install one first.
    expect(setupFiles[0]).toMatch(/vitest-setup-channel-file\.mjs$/);
    expect(setupFiles).toContain(USER_SETUP_FILE);
  });

  it("registers the screenshot setup after the user's setup files", () => {
    const { setupFiles } = configure();

    // `afterEach` hooks run in reverse registration order, so registering last
    // is what makes the screenshot happen before Storybook unmounts the story.
    expect(setupFiles.at(-1)).toMatch(/vitest-setup-file\.mjs$/);
  });

  it("adds the Argos reporter once for all the browser instances", () => {
    const { reporters } = configure({ uploadToArgos: true, projects: 3 });

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(ArgosReporter);
  });

  it("adds no reporter when not uploading to Argos", () => {
    const { reporters } = configure();

    expect(reporters).toHaveLength(0);
  });
});
