import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    format: ["esm"],
  },
  {
    entry: ["src/cli.ts"],
    dts: false,
    format: ["esm"],
  },
]);
