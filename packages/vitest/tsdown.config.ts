import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      // `@vitest/pretty-format` is intentionally bundled: keeping it external
      // makes its own transitive dep (`tinyrainbow`) unresolvable when Vitest
      // pre-bundles this package for the browser.
      neverBundle: [
        /^@argos-ci\//,
        "playwright",
        /^vitest/,
        "@vitest/browser",
        "@vitest/browser-playwright",
      ],
    },
  },
  {
    entry: ["src/plugin.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      // `@vitest/pretty-format` is intentionally bundled: keeping it external
      // makes its own transitive dep (`tinyrainbow`) unresolvable when Vitest
      // pre-bundles this package for the browser.
      neverBundle: [
        /^@argos-ci\//,
        "playwright",
        /^vitest/,
        "@vitest/browser",
        "@vitest/browser-playwright",
      ],
    },
  },
  {
    entry: ["src/internal.ts"],
    dts: true,
    format: ["esm"],
    deps: {
      // `@vitest/pretty-format` is intentionally bundled: keeping it external
      // makes its own transitive dep (`tinyrainbow`) unresolvable when Vitest
      // pre-bundles this package for the browser.
      neverBundle: [
        /^@argos-ci\//,
        "playwright",
        /^vitest/,
        "@vitest/browser",
        "@vitest/browser-playwright",
      ],
    },
  },
]);
