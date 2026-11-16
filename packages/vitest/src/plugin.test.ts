import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type * as NodeModule from "node:module";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArgosReporter, argosVitestPlugin } from "./plugin";

// The real implementation, unless a test simulates a missing package.
vi.mock("node:module", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeModule>();
  return { ...actual, createRequire: vi.fn(actual.createRequire) };
});

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "argos-vitest-plugin-"));
});

afterEach(async () => {
  vi.mocked(createRequire).mockReset();
  await rm(root, { recursive: true, force: true });
});

/** Run the plugin's `configureVitest` hook for one project. */
function configureVitest(
  plugin: ReturnType<typeof argosVitestPlugin>,
  context: { vitest: unknown; project: unknown },
) {
  (plugin.configureVitest as (context: unknown) => void)(context);
}

/** Configure a project, return its setup files. */
function configureProject(): string[] {
  const project = { config: { root, setupFiles: [join(root, "setup.ts")] } };
  configureVitest(argosVitestPlugin(), {
    vitest: { config: { reporters: [] } },
    project,
  });
  return project.config.setupFiles;
}

describe("argosVitestPlugin", () => {
  it("records stories first in projects with Storybook installed", async () => {
    const pkgPath = join(root, "node_modules", "storybook", "package.json");
    await mkdir(join(root, "node_modules", "storybook"), { recursive: true });
    await writeFile(pkgPath, JSON.stringify({ name: "storybook" }));

    const setupFiles = configureProject();
    expect(setupFiles).toHaveLength(2);
    expect(setupFiles[0]).toMatch(/storybook-setup-file\.mjs$/);
  });

  it("leaves projects without Storybook alone", () => {
    // Simulated: pnpm sets `NODE_PATH` to its store, from which Storybook
    // resolves anywhere in this repository.
    vi.mocked(createRequire).mockImplementation(
      () =>
        ({
          resolve: () => {
            throw new Error("Cannot find module 'storybook/package.json'");
          },
        }) as unknown as NodeJS.Require,
    );
    expect(configureProject()).toEqual([join(root, "setup.ts")]);
  });

  it("adds a single reporter, whatever the number of browser instances", () => {
    const plugin = argosVitestPlugin({ uploadToArgos: true });
    const vitest = { config: { reporters: ["default"] as unknown[] } };
    // Each browser of `browser.instances` is a project of its own.
    for (const browser of ["chromium", "firefox", "webkit"]) {
      configureVitest(plugin, {
        vitest,
        project: {
          config: { root, setupFiles: [], browser: { name: browser } },
        },
      });
    }
    expect(vitest.config.reporters).toHaveLength(2);
    expect(vitest.config.reporters[0]).toBe("default");
    expect(vitest.config.reporters[1]).toBeInstanceOf(ArgosReporter);
  });

  it("adds no reporter without uploadToArgos", () => {
    const vitest = { config: { reporters: [] as unknown[] } };
    configureVitest(argosVitestPlugin(), {
      vitest,
      project: { config: { root, setupFiles: [] } },
    });
    expect(vitest.config.reporters).toEqual([]);
  });
});
