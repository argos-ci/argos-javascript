import { describe, expect, it } from "vitest";
import { getIgnoreUploadFailuresSource } from "./upload";

describe("getIgnoreUploadFailuresSource", () => {
  it("returns null by default", () => {
    expect(getIgnoreUploadFailuresSource({}, {})).toBeNull();
  });

  it("returns the flag when it is set", () => {
    expect(
      getIgnoreUploadFailuresSource({ ignoreUploadFailures: true }, {}),
    ).toBe("--ignore-upload-failures");
  });

  it("prefers the flag over the environment variable", () => {
    expect(
      getIgnoreUploadFailuresSource(
        { ignoreUploadFailures: true },
        { ARGOS_IGNORE_UPLOAD_FAILURES: "true" },
      ),
    ).toBe("--ignore-upload-failures");
  });

  it.each(["true", "TRUE", "1"])(
    "returns the environment variable when it is %j",
    (value) => {
      expect(
        getIgnoreUploadFailuresSource(
          {},
          { ARGOS_IGNORE_UPLOAD_FAILURES: value },
        ),
      ).toBe("ARGOS_IGNORE_UPLOAD_FAILURES");
    },
  );

  it.each(["false", "False", ""])(
    "returns null when the environment variable is %j",
    (value) => {
      expect(
        getIgnoreUploadFailuresSource(
          {},
          { ARGOS_IGNORE_UPLOAD_FAILURES: value },
        ),
      ).toBeNull();
    },
  );
});
