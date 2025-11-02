import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/test-runner.ts"],
    dts: true,
    format: ["esm"],
    external: ["@storybook/test-runner", "playwright"],
  },
  {
    entry: ["src/vitest-plugin.ts"],
    dts: true,
    format: ["esm"],
    external: ["@argos-ci/core"],
  },
  {
    entry: ["src/vitest-setup-file.ts"],
    dts: false,
    format: ["esm"],
    external: ["vitest"],
  },
  {
    entry: ["src/vitest.ts"],
    dts: true,
    format: ["esm"],
    external: ["vitest"],
  },
]);
