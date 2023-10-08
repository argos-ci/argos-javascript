import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    threads: false,
    include: ["**/*.test.?(c|m)[jt]s?(x)"],
  },
});
