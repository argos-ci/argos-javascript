import { defineConfig } from "vitest/config";

/**
 * The e2e suite spawns the built CLI and talks to the live Argos API, so every
 * test is bound by network latency rather than by local compute. Vitest's
 * default 5s budget is routinely too tight on a loaded CI runner, which shows
 * up as a single matrix cell failing on a timeout while the others pass.
 *
 * Applied as a project-level default so individual tests and hooks don't have
 * to carry hand-written timeouts.
 */
const E2E_TIMEOUT = 30_000;

export default defineConfig({
  test: {
    tags: [
      {
        name: "oidc",
        description: "OIDC tests.",
      },
      {
        name: "tokenless",
        description: "Tokenless exchange tests.",
      },
    ],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          environment: "node",
          include: ["e2e/**/*.test.ts"],
          testTimeout: E2E_TIMEOUT,
          // Several e2e files seed state from the API in `beforeAll`, which is
          // subject to the same latency (default hook budget is 10s).
          hookTimeout: E2E_TIMEOUT,
        },
      },
    ],
  },
});
