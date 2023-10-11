import ts from "rollup-plugin-ts";
import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";

const bundle = (config) => ({
  input: "src/index.ts",
  external: (id) => !/^[./]/.test(id),
  ...config,
});

const bundleGlobal = (config) => ({
  input: "src/global.ts",
  external: (id) => !/^[./]/.test(id),
  ...config,
});

const swcPlugin = swc(
  defineRollupSwcOption({
    tsconfig: "../../tsconfig.build.json",
    jsc: {
      target: "es2021",
      parser: {
        syntax: "typescript",
      },
    },
  }),
);

export default [
  bundle({
    output: {
      file: `dist/index.mjs`,
      format: "es",
    },
    plugins: [swcPlugin],
  }),
  bundle({
    plugins: [ts({ transpiler: "swc" })],
    output: {
      file: `dist/index.d.ts`,
      format: "es",
    },
  }),
  bundleGlobal({
    output: {
      file: `dist/global.js`,
      format: "iife",
    },
    plugins: [swcPlugin],
  }),
  bundleGlobal({
    plugins: [ts({ transpiler: "swc" })],
    output: {
      file: `dist/global.d.ts`,
      format: "es",
    },
  }),
];
