import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/browser.ts"],
  dts: true,
  format: ["esm"],
  clean: false,
  target: false,
});
