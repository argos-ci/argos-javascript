import swc from "rollup-plugin-swc3";

const bundle = (config) => ({
  ...config,
  input: "src/index.ts",
  external: (id) => !/^[./]/.test(id),
});

export default [
  bundle({
    output: {
      file: `dist/index.mjs`,
      format: "es",
    },
    plugins: [swc()],
  }),
];
