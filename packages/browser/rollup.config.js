import {
  buildEs,
  buildTypes,
  ignoreRelative,
  swcPlugin,
} from "../../build/rollup.js";
import { readFileSync } from "node:fs";

import replace from "@rollup/plugin-replace";

const bundleGlobal = (config) => ({
  input: "src/global/index.ts",
  external: ignoreRelative,
  ...config,
});

export default [
  bundleGlobal({
    output: {
      file: `dist/global.js`,
      format: "iife",
    },
    plugins: [swcPlugin],
  }),
  buildEs({
    extraPlugins: [
      replace({
        preventAssignment: true,
        values: {
          "process.env.GLOBAL_SCRIPT": () =>
            JSON.stringify(readFileSync("dist/global.js", "utf-8")),
        },
      }),
    ],
    external: (id) => ignoreRelative(id) && id !== "__GLOBAL__",
  }),
  buildTypes(),
];
