import { describe, expect, it } from "vitest";
import { ArgosReporter } from "@argos-ci/vitest/plugin";
import { argosVitestPlugin } from "./vitest-plugin";

function configure(setupFiles: string[]) {
  const plugin = argosVitestPlugin({ uploadToArgos: false }) as any;
  const project = { config: { setupFiles } };
  plugin.configureVitest({ vitest: { config: { reporters: [] } }, project });
  return project.config.setupFiles as string[];
}

describe("argosVitestPlugin", () => {
  it("registers the channel setup ahead of the user's setup files", () => {
    const setupFiles = configure(["/project/.storybook/vitest.setup.ts"]);

    // Addon preview modules capture a channel when the user's setup file
    // imports them, so ours has to install one first.
    expect(setupFiles[0]).toMatch(/vitest-setup-channel-file\.mjs$/);
    expect(setupFiles).toContain("/project/.storybook/vitest.setup.ts");
  });

  it("registers the screenshot setup after the user's setup files", () => {
    const setupFiles = configure(["/project/.storybook/vitest.setup.ts"]);

    // `afterEach` hooks run in reverse registration order, so registering last
    // is what makes the screenshot happen before Storybook unmounts the story.
    expect(setupFiles.at(-1)).toMatch(/vitest-setup-file\.mjs$/);
  });

  it("adds the Argos reporter once for all the browser instances", () => {
    const plugin = argosVitestPlugin({ uploadToArgos: true }) as any;
    const vitest = { config: { reporters: [] as unknown[] } };
    // Vitest runs each browser of `browser.instances` as a project of its own,
    // and calls `configureVitest` for each of them.
    for (const browser of ["chromium", "firefox", "webkit"]) {
      plugin.configureVitest({
        vitest,
        project: { name: browser, config: { setupFiles: [] } },
      });
    }

    expect(vitest.config.reporters).toHaveLength(1);
    expect(vitest.config.reporters[0]).toBeInstanceOf(ArgosReporter);
  });

  it("adds no reporter when not uploading to Argos", () => {
    const plugin = argosVitestPlugin({ uploadToArgos: false }) as any;
    const vitest = { config: { reporters: [] as unknown[] } };
    plugin.configureVitest({ vitest, project: { config: { setupFiles: [] } } });

    expect(vitest.config.reporters).toHaveLength(0);
  });
});
