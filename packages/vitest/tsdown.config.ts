import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^vitest/, /^@vitest/],
    },
  },
  {
    entry: ["src/plugin.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^vitest/, /^@vitest/],
    },
  },
  {
    entry: ["src/internal.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^vitest/, /^@vitest/],
    },
  },
]);
