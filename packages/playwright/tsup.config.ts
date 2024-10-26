import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    clean: true,
    external: ["@playwright/test"],
    format: ["esm"],
  },
  {
    entry: ["src/reporter.ts"],
    dts: true,
    clean: true,
    format: ["esm"],
  },
]);
