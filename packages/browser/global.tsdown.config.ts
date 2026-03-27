import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/global/index.ts"],
  format: ["iife"],
});
