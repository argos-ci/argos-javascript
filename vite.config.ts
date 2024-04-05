import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.?(c|m)[jt]s?(x)"],
  },
});
