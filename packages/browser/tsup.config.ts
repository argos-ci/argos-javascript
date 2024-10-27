import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  env: {
    ["GLOBAL_SCRIPT"]: readFileSync("dist/index.global.js", "utf-8"),
  },
});
