import { describe, expect, test } from "vitest";

import { run, type CommandError } from "./utils";

/** The search is public: it must work without any Argos token around. */
const baseEnv: NodeJS.ProcessEnv = { ...process.env, ARGOS_TOKEN: "" };

describe("argos docs search", () => {
  test("returns ranked documentation pages in JSON mode", () => {
    const output = run(
      ["docs", "search", "parallel builds", "--limit", "3", "--json"],
      baseEnv,
    );
    const results = JSON.parse(output.stdout);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const result of results) {
      expect(result.title).toEqual(expect.any(String));
      expect(result.url).toMatch(/^https:\/\/argos-ci\.com\/docs\//);
    }
  });

  test("rejects a limit above what the search returns", () => {
    let error: CommandError | undefined;
    try {
      run(["docs", "search", "upload", "--limit", "50"], baseEnv);
    } catch (err) {
      error = err as CommandError;
    }
    expect(error?.status).toBe(1);
    expect(error?.stderr).toContain("--limit must be at most 10");
  });
});
