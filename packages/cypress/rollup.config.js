import ts from "rollup-plugin-ts";
import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";

const bundle = (config) => ({
  input: "src/support.ts",
  external: (id) => {
    return !/^[./]/.test(id);
  },
  ...config,
});

const swcPlugin = swc(
  defineRollupSwcOption({
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
      file: `dist/support.mjs`,
      format: "es",
    },
    plugins: [swcPlugin],
  }),
  bundle({
    plugins: [ts({ transpiler: "swc" })],
    output: {
      file: `dist/support.d.ts`,
      format: "es",
    },
  }),
];
