import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/support.ts"],
    dts: true,
    format: ["esm"],
  },
  {
    entry: ["src/task.ts"],
    dts: true,
    format: ["esm", "cjs"],
  },
]);
