import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";
import ts from "rollup-plugin-ts";
import { fileURLToPath, URL } from "node:url";

const bundle = (config) => ({
  external: (id) => {
    return id === "./index.mjs" || !/^[./]/.test(id);
  },
  ...config,
});

const swcPlugin = swc(
  defineRollupSwcOption({
    jsc: {
      baseUrl: fileURLToPath(new URL(".", import.meta.url)),
      target: "es2021",
      parser: {
        syntax: "typescript",
      },
    },
  }),
);

export default [
  bundle({
    input: "src/index.ts",
    output: {
      file: "dist/index.mjs",
      format: "es",
    },
    plugins: [swcPlugin],
  }),
  bundle({
    input: "src/index.cjs.ts",
    output: {
      file: "dist/index.cjs",
      format: "es",
    },
    plugins: [swcPlugin],
  }),
  {
    input: "src/index.ts",
    plugins: [ts({ transpiler: "swc" })],
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
  },
];
