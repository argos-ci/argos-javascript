import dts from "rollup-plugin-dts";
import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";

const bundle = (config) => ({
  input: "src/index.ts",
  external: (id) => {
    return id === "./index.mjs" || !/^[./]/.test(id);
  },
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
    input: "src/index.cjs.ts",
    output: {
      file: `dist/index.cjs`,
      format: "es",
    },
    plugins: [swcPlugin],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `dist/index.d.ts`,
      format: "es",
    },
  }),
];
