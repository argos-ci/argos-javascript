import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/browser.ts"],
  dts: true,
  clean: true,
  format: ["esm"],
});
