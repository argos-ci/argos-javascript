import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBody } from "./body";
import { CliError } from "./cli-error";

describe("resolveBody", () => {
  it("returns the inline body", async () => {
    await expect(resolveBody({ body: "hello" })).resolves.toBe("hello");
  });

  it("preserves an empty inline body", async () => {
    await expect(resolveBody({ body: "" })).resolves.toBe("");
  });

  it("reads the body from a file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "argos-body-"));
    const file = join(dir, "comment.md");
    writeFileSync(file, "# From file");
    await expect(resolveBody({ bodyFile: file })).resolves.toBe("# From file");
  });

  it("returns undefined when nothing is provided", async () => {
    await expect(resolveBody({})).resolves.toBeUndefined();
  });

  it("throws when required and nothing is provided", async () => {
    await expect(resolveBody({}, { required: true })).rejects.toThrow(CliError);
  });

  it("throws when both body and bodyFile are provided", async () => {
    await expect(resolveBody({ body: "x", bodyFile: "y" })).rejects.toThrow(
      /not both/,
    );
  });

  it("throws a CliError when the file cannot be read", async () => {
    await expect(resolveBody({ bodyFile: "/no/such/file.md" })).rejects.toThrow(
      CliError,
    );
  });
});
