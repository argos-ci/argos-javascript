import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveInstalledPackage, resolveStorybookLibrary } from "./version";

/** A user project, outside of this package, with Storybook installed. */
let project: string;
let testFile: string;

async function installPackage(name: string, version: string) {
  const pkgPath = join(project, "node_modules", name, "package.json");
  await mkdir(dirname(pkgPath), { recursive: true });
  await writeFile(pkgPath, JSON.stringify({ name, version }));
}

beforeAll(async () => {
  project = await mkdtemp(join(tmpdir(), "argos-vitest-project-"));
  testFile = join(project, "src", "Button.test.tsx");
  await installPackage("storybook", "10.6.1");
  await installPackage("@storybook/addon-vitest", "10.6.2");
});

afterAll(async () => {
  await rm(project, { recursive: true, force: true });
});

describe("resolveInstalledPackage", () => {
  it("resolves the first installed package from a file of the project", async () => {
    await expect(
      resolveInstalledPackage(["argos-missing-package", "storybook"], testFile),
    ).resolves.toEqual({ name: "storybook", version: "10.6.1" });
  });

  it("returns null when none is installed", async () => {
    await expect(
      resolveInstalledPackage(["argos-missing-package"], testFile),
    ).resolves.toBeNull();
  });
});

describe("resolveStorybookLibrary", () => {
  it("reports the Storybook package running the story", async () => {
    await expect(
      resolveStorybookLibrary(
        { source: "portable-stories", story: null },
        testFile,
      ),
    ).resolves.toEqual({ name: "storybook", version: "10.6.1" });
    await expect(
      resolveStorybookLibrary(
        { source: "addon-vitest", story: null },
        testFile,
      ),
    ).resolves.toEqual({ name: "@storybook/addon-vitest", version: "10.6.2" });
  });
});
