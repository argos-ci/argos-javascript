import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";

const bundle = (config) => ({
  ...config,
  input: "src/index.ts",
  external: (id) => id === "../package.json" || !/^[./]/.test(id),
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
      file: `dist/index.mjs`,
      format: "es",
    },
    plugins: [swcPlugin],
  }),
];
