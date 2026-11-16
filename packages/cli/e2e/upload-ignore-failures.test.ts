import { describe, expect, it } from "vitest";

import { run } from "./utils";

// A malformed token makes the upload fail on config validation, before any
// network call, so these tests neither touch the API nor wait on its retries.
const failingEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ARGOS_TOKEN: "invalid",
  ARGOS_IGNORE_UPLOAD_FAILURES: undefined,
};

const args = ["upload", "../../__fixtures__/screenshots/nested"];

describe("upload failures", () => {
  it("fail the command by default", () => {
    expect(() => run(args, failingEnv)).toThrow(
      expect.objectContaining({ status: 1 }),
    );
  });

  it("are ignored with --ignore-upload-failures", () => {
    const result = run([...args, "--ignore-upload-failures"], failingEnv);
    expect(result.combined).toContain("Build failed");
    expect(result.combined).toContain(
      "Upload failure ignored due to --ignore-upload-failures",
    );
  });

  it("are ignored with ARGOS_IGNORE_UPLOAD_FAILURES", () => {
    expect(() =>
      run(args, { ...failingEnv, ARGOS_IGNORE_UPLOAD_FAILURES: "true" }),
    ).not.toThrow();
  });
});
