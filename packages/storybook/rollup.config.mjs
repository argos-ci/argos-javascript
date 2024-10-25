import { buildEs, buildTypes, ignoreRelative } from "../../build/rollup.js";

export default [
  buildEs(),
  buildTypes(),
  buildEs({
    input: "src/index.cjs.ts",
    output: "dist/index.cjs",
    external: (id) => ignoreRelative(id) || id === "./index.mjs",
  }),
];
