import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/global/index.ts"],
  format: ["iife"],
});
