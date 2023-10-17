import { buildEs, buildTypes } from "../../build/rollup.js";

export default [
  buildEs(),
  buildTypes(),
  buildEs({
    input: "src/browser.ts",
    output: "./dist/browser.mjs",
    external: false,
  }),
  buildTypes({
    input: "src/browser.ts",
    output: "./dist/browser.d.ts",
  }),
];
