import { buildEs, buildTypes } from "../../build/rollup.js";

export default [
  buildEs(),
  buildTypes(),
  buildEs({ input: "src/cli.ts", output: "dist/cli.mjs" }),
];
