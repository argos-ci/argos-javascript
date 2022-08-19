import dts from "rollup-plugin-dts";
import swc from "rollup-plugin-swc3";

const bundle = (config) => ({
  input: "src/index.ts",
  external: (id) => {
    return id === "./index.mjs" || !/^[./]/.test(id);
  },
  ...config,
});

export default [
  bundle({
    output: {
      file: `dist/index.mjs`,
      format: "es",
    },
    plugins: [swc()],
  }),
  bundle({
    input: "src/index.cjs.ts",
    output: {
      file: `dist/index.cjs`,
      format: "es",
    },
    plugins: [swc()],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `dist/index.d.ts`,
      format: "es",
    },
  }),
];
