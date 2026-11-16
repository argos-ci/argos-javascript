import { describe, expect, it } from "vitest";

import { CliError } from "./cli-error";
import {
  checkTimeZone,
  formatInTimeZone,
  getStartOfDayDaysAgo,
  parseDateTimeOrFail,
} from "./time-zone";

describe("checkTimeZone", () => {
  it("accepts IANA names", () => {
    for (const timeZone of ["UTC", "Europe/Paris", "America/New_York"]) {
      expect(() => checkTimeZone(timeZone)).not.toThrow();
    }
  });

  it("rejects names the runtime does not know", () => {
    for (const timeZone of ["Mars/Olympus", "UTC+2", ""]) {
      expect(() => checkTimeZone(timeZone)).toThrow(CliError);
      expect(() => checkTimeZone(timeZone)).toThrow(
        `Unknown time zone "${timeZone}". Use an IANA name such as Europe/Paris.`,
      );
    }
  });
});

describe("parseDateTimeOrFail", () => {
  it.each([
    ["2026-11-02", "UTC", "2026-11-02T00:00:00.000Z"],
    ["2026-11-02", "Europe/Paris", "2026-11-01T23:00:00.000Z"],
    ["2026-07-01", "Europe/Paris", "2026-06-30T22:00:00.000Z"],
    ["2026-11-02", "America/New_York", "2026-11-02T05:00:00.000Z"],
    ["2026-11-02", "Asia/Kolkata", "2026-11-01T18:30:00.000Z"],
    // Clocks go back the night before, so midnight is still daylight time.
    ["2026-11-01", "America/New_York", "2026-11-01T04:00:00.000Z"],
    // Midnight is skipped: the day starts when clocks jump to 01:00.
    ["2026-09-06", "America/Santiago", "2026-09-06T04:00:00.000Z"],
    // Midnight happens twice: the day starts at the first one.
    ["2026-11-01", "America/Havana", "2026-11-01T04:00:00.000Z"],
  ])("reads the date %s as midnight in %s", (value, timeZone, expected) => {
    expect(parseDateTimeOrFail(value, "from", { timeZone })).toBe(expected);
  });

  it.each([
    ["2026-11-02", "UTC", "2026-11-02T23:59:59.999Z"],
    ["2026-11-02", "Europe/Paris", "2026-11-02T22:59:59.999Z"],
    // 23-hour day: clocks go forward.
    ["2026-03-29", "Europe/Paris", "2026-03-29T21:59:59.999Z"],
    // 25-hour day: clocks go back.
    ["2026-11-01", "America/New_York", "2026-11-02T04:59:59.999Z"],
  ])(
    "reads the date %s as the end of that day in %s with endOfDay",
    (value, timeZone, expected) => {
      expect(
        parseDateTimeOrFail(value, "to", { timeZone, endOfDay: true }),
      ).toBe(expected);
    },
  );

  it.each([
    ["2026-11-02T08:30", "2026-11-02T07:30:00.000Z"],
    ["2026-11-02 08:30", "2026-11-02T07:30:00.000Z"],
    ["2026-11-02T08:30:15", "2026-11-02T07:30:15.000Z"],
    ["2026-11-02T08:30:15.5", "2026-11-02T07:30:15.500Z"],
  ])("reads %s as wall-clock time in the zone", (value, expected) => {
    expect(
      parseDateTimeOrFail(value, "to", {
        timeZone: "Europe/Paris",
        endOfDay: true,
      }),
    ).toBe(expected);
  });

  it("keeps the offset of a datetime that has one", () => {
    const options = { timeZone: "America/New_York", endOfDay: true };
    expect(
      parseDateTimeOrFail("2026-11-02T00:00:00+01:00", "to", options),
    ).toBe("2026-11-01T23:00:00.000Z");
    expect(parseDateTimeOrFail("2026-11-02T00:00:00Z", "to", options)).toBe(
      "2026-11-02T00:00:00.000Z",
    );
  });

  it("rejects values that are not a valid date", () => {
    for (const value of ["2026-02-30", "2026-11-02T24:00", "not-a-date"]) {
      expect(() =>
        parseDateTimeOrFail(value, "from", { timeZone: "UTC" }),
      ).toThrow(`Invalid --from value: "${value}"`);
    }
  });
});

describe("getStartOfDayDaysAgo", () => {
  it.each([
    ["2026-11-16T12:00:00.000Z", "UTC", "2026-10-17T00:00:00.000Z"],
    ["2026-11-16T12:00:00.000Z", "Europe/Paris", "2026-10-16T22:00:00.000Z"],
    // Already November 17 in Paris.
    ["2026-11-16T23:30:00.000Z", "Europe/Paris", "2026-10-17T22:00:00.000Z"],
    // Still November 15 in Los Angeles.
    [
      "2026-11-16T03:00:00.000Z",
      "America/Los_Angeles",
      "2026-10-16T07:00:00.000Z",
    ],
  ])(
    "counts 30 days back from %s to midnight in %s",
    (now, timeZone, expected) => {
      expect(getStartOfDayDaysAgo(30, timeZone, new Date(now))).toBe(expected);
    },
  );
});

describe("formatInTimeZone", () => {
  it.each([
    ["2026-11-02T00:00:00.000Z", "UTC", "2026-11-02T00:00:00Z"],
    ["2026-11-01T23:00:00.000Z", "Europe/Paris", "2026-11-02T00:00:00+01:00"],
    ["2026-11-02T22:59:59.999Z", "Europe/Paris", "2026-11-02T23:59:59+01:00"],
    [
      "2026-11-02T05:00:00.000Z",
      "America/New_York",
      "2026-11-02T00:00:00-05:00",
    ],
    ["2026-11-01T18:30:00.000Z", "Asia/Kolkata", "2026-11-02T00:00:00+05:30"],
  ])("formats %s in %s", (iso, timeZone, expected) => {
    expect(formatInTimeZone(iso, timeZone)).toBe(expected);
  });
});
