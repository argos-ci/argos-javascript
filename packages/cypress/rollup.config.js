import { buildCjs, buildEs, buildTypes } from "../../build/rollup.js";

export default [
  buildEs({
    input: "src/support.ts",
    output: "dist/support.mjs",
  }),
  buildTypes({
    input: "src/support.ts",
    output: "dist/support.d.ts",
  }),
  buildEs({
    input: "src/task.ts",
    output: "dist/task.mjs",
  }),
  buildTypes({
    input: "src/task.ts",
    output: "dist/task.d.ts",
  }),
  buildCjs({
    input: "src/task.ts",
    output: "dist/task.cjs",
  }),
];
