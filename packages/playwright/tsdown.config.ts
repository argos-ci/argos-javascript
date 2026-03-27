import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: ["playwright-core", "playwright", "@playwright/test"],
    },
  },
  {
    entry: ["src/reporter.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: ["playwright-core", "playwright", "@playwright/test"],
    },
  },
]);
