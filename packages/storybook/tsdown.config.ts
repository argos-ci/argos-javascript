import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/test-runner.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [
        /^@argos-ci\//,
        "playwright",
        /^storybook/,
        "@storybook/test-runner",
      ],
    },
  },
  {
    entry: ["src/vitest-plugin.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^storybook/, /^vitest/],
    },
  },
  {
    entry: ["src/vitest-setup-file.ts"],
    dts: false,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^storybook/, /^vitest/],
    },
  },
  {
    entry: ["src/vitest.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      neverBundle: [/^@argos-ci\//, "playwright", /^storybook/, /^vitest/],
    },
  },
]);
