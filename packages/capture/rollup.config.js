import dts from "rollup-plugin-dts";
import swc from "rollup-plugin-swc3";

const bundle = (config) => ({
  input: "src/index.ts",
  external: (id) => {
    return id === "./index.mjs" || !/^[./]/.test(id);
  },
  ...config,
});

const swcPlugin = swc({
  jsc: {
    target: "es2021",
  },
});

export default [
  bundle({
    output: {
      file: `dist/index.mjs`,
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
