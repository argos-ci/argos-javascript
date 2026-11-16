import { describe, expect, it } from "vitest";

import { CommandError, run } from "./utils";

// Point the CLI at a closed local port so the upload fails without touching
// the real API. The token only has to be well-formed.
const failingEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ARGOS_API_BASE_URL: "http://127.0.0.1:9/",
  ARGOS_TOKEN: "0".repeat(40),
  ARGOS_IGNORE_UPLOAD_FAILURES: undefined,
};

const args = ["upload", "../../__fixtures__/screenshots/nested"];

describe("upload failures", () => {
  it("fail the command by default", () => {
    let error: unknown;
    try {
      run(args, failingEnv);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(CommandError);
    expect((error as CommandError).status).toBe(1);
  });

  it("are ignored with --ignore-upload-failures", () => {
    const result = run([...args, "--ignore-upload-failures"], failingEnv);
    expect(result.combined).toContain("Build failed");
    expect(result.combined).toContain(
      "Upload failure ignored due to --ignore-upload-failures",
    );
  });

  it("are ignored with ARGOS_IGNORE_UPLOAD_FAILURES", () => {
    const result = run(args, {
      ...failingEnv,
      ARGOS_IGNORE_UPLOAD_FAILURES: "true",
    });
    expect(result.combined).toContain(
      "Upload failure ignored due to ARGOS_IGNORE_UPLOAD_FAILURES",
    );
  });
});
