import { describe, expect, it } from "vitest";
import { getIgnoreUploadFailuresSource } from "./upload";

describe("getIgnoreUploadFailuresSource", () => {
  it("returns null by default", () => {
    expect(getIgnoreUploadFailuresSource({}, {})).toBeNull();
  });

  it("prefers the flag over the environment variable", () => {
    expect(
      getIgnoreUploadFailuresSource(
        { ignoreUploadFailures: true },
        { ARGOS_IGNORE_UPLOAD_FAILURES: "false" },
      ),
    ).toBe("--ignore-upload-failures");
  });

  it.each([
    ["true", "ARGOS_IGNORE_UPLOAD_FAILURES"],
    ["TRUE", "ARGOS_IGNORE_UPLOAD_FAILURES"],
    ["1", "ARGOS_IGNORE_UPLOAD_FAILURES"],
    ["false", null],
    ["False", null],
    ["", null],
  ])("reads ARGOS_IGNORE_UPLOAD_FAILURES=%j as %j", (value, expected) => {
    expect(
      getIgnoreUploadFailuresSource(
        {},
        { ARGOS_IGNORE_UPLOAD_FAILURES: value },
      ),
    ).toBe(expected);
  });
});
