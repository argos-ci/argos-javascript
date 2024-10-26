import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/support.ts"],
    dts: true,
    clean: true,
    format: ["esm"],
  },
  {
    entry: ["src/task.ts"],
    dts: true,
    clean: true,
    format: ["esm", "cjs"],
  },
]);
