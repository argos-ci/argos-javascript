import { describe, expect, it } from "vitest";
import { CliError } from "./cli-error";
import { parseProjectPath, parseProjectPathOrFail } from "./project";

describe("parseProjectPath", () => {
  it("parses owner/project", () => {
    expect(parseProjectPath("argos-ci/argos")).toEqual({
      owner: "argos-ci",
      project: "argos",
    });
  });

  it("rejects slugs without exactly two segments", () => {
    expect(parseProjectPath("argos")).toBeNull();
    expect(parseProjectPath("a/b/c")).toBeNull();
    expect(parseProjectPath("/argos")).toBeNull();
    expect(parseProjectPath("argos/")).toBeNull();
    expect(parseProjectPath("")).toBeNull();
  });
});

describe("parseProjectPathOrFail", () => {
  it("returns the parsed path", () => {
    expect(parseProjectPathOrFail("a/b")).toEqual({ owner: "a", project: "b" });
  });

  it("throws a CliError on an invalid slug", () => {
    expect(() => parseProjectPathOrFail("invalid")).toThrow(CliError);
    expect(() => parseProjectPathOrFail("invalid")).toThrow(/owner\/project/);
  });
});
