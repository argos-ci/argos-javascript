import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  env: {
    ["process.env.GLOBAL_SCRIPT"]: JSON.stringify(
      readFileSync("dist/index.global.js", "utf-8"),
    ),
  },
});
