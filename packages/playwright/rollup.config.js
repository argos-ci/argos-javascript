import { buildEs, buildTypes, ignoreRelative } from "../../build/rollup.js";

export default [
  buildEs(),
  buildTypes(),
  buildEs({
    input: "src/reporter.ts",
    output: "dist/reporter.mjs",
  }),
  buildTypes({
    input: "src/reporter.ts",
    output: "dist/reporter.d.ts",
  }),
  buildEs({
    input: "src/index.cjs.ts",
    output: "dist/index.cjs",
    external: (id) => ignoreRelative(id) || id === "./index.mjs",
  }),
];
