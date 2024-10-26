import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    clean: true,
    format: ["esm"],
  },
  {
    entry: ["src/cli.ts"],
    dts: false,
    clean: true,
    format: ["esm"],
  },
]);
