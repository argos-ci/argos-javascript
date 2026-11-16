import { DAY_MS, toIsoOrFail } from "../options";
import { fail } from "./cli-error";

/**
 * Abort unless the runtime knows `timeZone`. The API also rejects numeric
 * offsets such as "+02:00", which `Intl` accepts, with the same message.
 */
export function checkTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    fail(
      `Unknown time zone "${timeZone}". Use an IANA name such as Europe/Paris.`,
    );
  }
}

/**
 * Milliseconds to add to `timestamp` to get the wall-clock time `timeZone`
 * shows at that instant, read as if it were UTC.
 */
function getOffset(timestamp: number, timeZone: string): number {
  const seconds = Math.floor(timestamp / 1000) * 1000;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(seconds);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallClock = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallClock - seconds;
}

/**
 * The instant at which `timeZone` shows `wallClock`. Ambiguous times resolve
 * like Temporal's "compatible" mode: a time shown twice when clocks go back is
 * its first occurrence, and a time skipped when they go forward is read with
 * the offset from before the jump.
 */
function fromWallClock(wallClock: number, timeZone: string): number {
  const before = wallClock - getOffset(wallClock - DAY_MS, timeZone);
  const after = wallClock - getOffset(wallClock + DAY_MS, timeZone);
  const matches = [before, after].filter(
    (instant) => instant + getOffset(instant, timeZone) === wallClock,
  );
  return matches.length > 0 ? Math.min(...matches) : before;
}

const WALL_CLOCK_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/;

/**
 * Parse the value of `--<option>` into an ISO 8601 instant, or abort. A date,
 * or a datetime without an offset, is read as wall-clock time in `timeZone`.
 * With `endOfDay`, a date stands for the last millisecond of that day, so a
 * range ending on it covers the whole day.
 */
export function parseDateTimeOrFail(
  value: string,
  option: string,
  { timeZone, endOfDay = false }: { timeZone: string; endOfDay?: boolean },
): string {
  const match = WALL_CLOCK_REGEX.exec(value);
  if (!match) {
    return toIsoOrFail(value, option);
  }
  const [, year, month, day, hour, minute, second, fraction] = match;
  const time = `${hour ?? "00"}:${minute ?? "00"}:${second ?? "00"}`;
  const wallClock = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour ?? 0),
    Number(minute ?? 0),
    Number(second ?? 0),
    Number((fraction ?? "").padEnd(3, "0")),
  );
  // `Date.UTC` rolls "2026-02-30" over to March 2 instead of failing.
  if (
    new Date(wallClock).toISOString().slice(0, 19) !==
    `${year}-${month}-${day}T${time}`
  ) {
    fail(`Invalid --${option} value: "${value}". Use an ISO 8601 datetime.`);
  }
  const instant =
    endOfDay && hour === undefined
      ? fromWallClock(wallClock + DAY_MS, timeZone) - 1
      : fromWallClock(wallClock, timeZone);
  return new Date(instant).toISOString();
}

/** Midnight in `timeZone`, `days` days before the day it is there at `now`. */
export function getStartOfDayDaysAgo(
  days: number,
  timeZone: string,
  now: Date,
): string {
  const timestamp = now.getTime();
  const today =
    Math.floor((timestamp + getOffset(timestamp, timeZone)) / DAY_MS) * DAY_MS;
  return new Date(fromWallClock(today - days * DAY_MS, timeZone)).toISOString();
}

/**
 * Format an instant as the wall-clock time `timeZone` shows, with its offset:
 * "2026-11-02T00:00:00+01:00", or "2026-11-02T00:00:00Z" in UTC.
 */
export function formatInTimeZone(iso: string, timeZone: string): string {
  const timestamp = Date.parse(iso);
  const offset = getOffset(timestamp, timeZone);
  const wallClock = new Date(timestamp + offset).toISOString().slice(0, 19);
  if (offset === 0) {
    return `${wallClock}Z`;
  }
  const minutes = Math.round(Math.abs(offset) / 60_000);
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const rest = String(minutes % 60).padStart(2, "0");
  return `${wallClock}${offset < 0 ? "-" : "+"}${hours}:${rest}`;
}
