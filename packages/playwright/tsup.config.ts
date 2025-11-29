import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    external: ["@playwright/test"],
    format: ["esm"],
  },
  {
    entry: ["src/reporter.ts"],
    dts: true,
    external: ["@playwright/test"],
    format: ["esm"],
  },
]);
