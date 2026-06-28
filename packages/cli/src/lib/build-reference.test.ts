import { describe, expect, it } from "vitest";
import {
  parseBuildReference,
  parseBuildReferenceOrFail,
} from "./build-reference";
import { CliError } from "./cli-error";

describe("parseBuildReference", () => {
  it("parses a bare build number", () => {
    expect(parseBuildReference("1234")).toEqual({ buildNumber: 1234 });
  });

  it("rejects zero, negative, and non-integer numbers", () => {
    expect(parseBuildReference("0")).toBeNull();
    expect(parseBuildReference("-5")).toBeNull();
    expect(parseBuildReference("1.5")).toBeNull();
  });

  it("rejects non-numeric, non-URL input", () => {
    expect(parseBuildReference("not-a-number")).toBeNull();
    expect(parseBuildReference("")).toBeNull();
  });

  it("parses a production build URL", () => {
    expect(
      parseBuildReference(
        "https://app.argos-ci.com/argos-ci/argos-javascript/builds/72652",
      ),
    ).toEqual({
      owner: "argos-ci",
      project: "argos-javascript",
      buildNumber: 72652,
    });
  });

  it("parses a build URL with a trailing path, query, or hash", () => {
    expect(
      parseBuildReference(
        "https://app.argos-ci.com/team/project/builds/42?foo=bar",
      ),
    ).toEqual({ owner: "team", project: "project", buildNumber: 42 });
    expect(
      parseBuildReference("https://app.argos-ci.com/team/project/builds/42#x"),
    ).toEqual({ owner: "team", project: "project", buildNumber: 42 });
  });

  it("parses a local dev build URL with a port", () => {
    expect(
      parseBuildReference(
        "https://app.argos-ci.dev:7807/team/project/builds/7",
      ),
    ).toEqual({ owner: "team", project: "project", buildNumber: 7 });
  });

  it("rejects unrelated URLs", () => {
    expect(
      parseBuildReference("https://example.com/team/project/builds/7"),
    ).toBeNull();
  });
});

describe("parseBuildReferenceOrFail", () => {
  it("returns the parsed reference", () => {
    expect(parseBuildReferenceOrFail("1234")).toEqual({ buildNumber: 1234 });
  });

  it("throws a CliError on invalid input", () => {
    expect(() => parseBuildReferenceOrFail("nope")).toThrow(CliError);
    expect(() => parseBuildReferenceOrFail("nope")).toThrow(
      /valid build number or Argos build URL/,
    );
  });
});
