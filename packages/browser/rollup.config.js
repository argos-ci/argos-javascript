import {
  buildEs,
  buildTypes,
  ignoreRelative,
  swcPlugin,
  tsPlugin,
} from "../../build/rollup.js";

const bundleGlobal = (config) => ({
  input: "src/global.ts",
  external: ignoreRelative,
  ...config,
});

const bundleCypress = (config) => ({
  input: "src/cypress.ts",
  external: ignoreRelative,
  ...config,
});

export default [
  buildEs(),
  buildTypes(),
  bundleGlobal({
    output: {
      file: `dist/global.js`,
      format: "iife",
    },
    plugins: [swcPlugin],
  }),
  bundleGlobal({
    output: {
      file: `dist/global.d.ts`,
      format: "es",
    },
    plugins: [tsPlugin],
  }),
  bundleCypress({
    output: {
      file: `dist/cypress.cjs`,
      format: "cjs",
    },
    plugins: [swcPlugin],
  }),
  bundleCypress({
    output: {
      file: `dist/cypress.d.ts`,
      format: "es",
    },
    plugins: [tsPlugin],
  }),
];
