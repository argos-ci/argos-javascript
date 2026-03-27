import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  env: {
    ["GLOBAL_SCRIPT"]: readFileSync("dist/index.iife.js", "utf-8"),
  },
  clean: false,
  target: false,
});
