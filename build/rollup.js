import { swc } from "rollup-plugin-swc3";
import ts from "rollup-plugin-ts";

export const swcPlugin = swc({
  jsc: {
    parser: {
      syntax: "typescript",
    },
    target: undefined,
  },
  env: {
    targets: {
      node: "16",
    },
  },
});

export const tsPlugin = ts({ transpiler: "swc" });

export const ignoreRelative = (id) => !/^[./]/.test(id);

export const buildEs = ({
  input = "src/index.ts",
  output = "dist/index.mjs",
  external = ignoreRelative,
} = {}) => ({
  input,
  external,
  output: {
    file: output,
    format: "es",
  },
  plugins: [swcPlugin],
});

export const buildTypes = ({
  input = "src/index.ts",
  output = "dist/index.d.ts",
  external = ignoreRelative,
} = {}) => ({
  input,
  external,
  plugins: [tsPlugin],
  output: {
    file: output,
    format: "es",
  },
});
