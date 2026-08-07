import { defineConfig } from "vitest/config";

// Node unit tests. The browser tests that run the stories live in
// `vitest.config.ts`, which is driven by `@storybook/addon-vitest`.
export default defineConfig({
  test: {
    name: "unit",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
