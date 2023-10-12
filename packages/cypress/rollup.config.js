import { buildEs, buildTypes } from "../../build/rollup.js";

export default [
  buildEs({
    input: "src/support.ts",
    output: "dist/support.mjs",
  }),
  buildTypes({
    input: "src/support.ts",
    output: "dist/support.d.ts",
  }),
];
