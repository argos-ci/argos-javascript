import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type * as NodeModule from "node:module";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { argosVitestPlugin } from "./plugin";

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

/** Run the plugin's `configureVitest` hook, return the project setup files. */
function configureProject(): string[] {
  const plugin = argosVitestPlugin();
  const project = { config: { root, setupFiles: [join(root, "setup.ts")] } };
  const configureVitest = plugin.configureVitest as (context: {
    vitest: unknown;
    project: unknown;
  }) => void;
  configureVitest({ vitest: { config: { reporters: [] } }, project });
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
});
