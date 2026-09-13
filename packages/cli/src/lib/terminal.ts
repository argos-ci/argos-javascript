/**
 * Printing text the CLI did not author — an OAuth error description chosen by
 * the authorization server, for instance.
 *
 * A terminal acts on what it is given: an ANSI escape sequence moves the
 * cursor, erases a line or repaints it, and a carriage return overwrites the
 * line just printed. Remote text reaching it unfiltered therefore doesn't just
 * read badly, it can forge CLI output — a fake "run this command to continue"
 * instruction under the CLI's own name (GHSA-q9j4-4h4j-mv5m).
 */

/**
 * Longest remote string we print. A description is a sentence; a wall of text
 * is itself a way to scroll the real message off the screen.
 */
const MAX_LENGTH = 200;

/**
 * Escape sequences, matched together with the bytes that belong to them so no
 * parameter remnant (`[2K`) is left behind as text: CSI (`ESC [`), OSC
 * (`ESC ]`, up to its terminator) and, last, the plain escape sequences —
 * optional intermediate bytes and a final one, which covers `ESC c` (reset the
 * terminal) as much as `ESC 7`.
 */
const ESCAPE_SEQUENCE_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B](?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001B]*(?:\u0007|\u001B\\)?|[ -/]*[0-~])/g;

/** Anything else a terminal acts on rather than displays: C0, DEL and C1. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * Explicit directional formatting: the other way to make a line read as
 * something other than what it says, by reordering the characters around it
 * rather than by driving the terminal. Bidirectional text itself is untouched —
 * only the overrides, embeddings, isolates and marks are dropped.
 */
const DIRECTIONAL_FORMATTING_REGEX =
  /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Reduce remote text to characters a terminal can only display, on a single
 * line and bounded in length.
 *
 * Returns an empty string when nothing printable is left, so callers can fall
 * back to a message of their own rather than print a blank error.
 *
 * @param text The remote value. Typed `unknown` because it comes from parsed
 * JSON or a URL parameter and is not necessarily a string at runtime.
 */
export function sanitizeTerminalText(text: unknown): string {
  if (text === null || text === undefined) {
    return "";
  }
  const sanitized = String(text)
    .replace(ESCAPE_SEQUENCE_REGEX, "")
    .replace(DIRECTIONAL_FORMATTING_REGEX, "")
    // Replaced rather than dropped: removing the separator in `foo\rbar` would
    // splice two words into one.
    .replace(CONTROL_CHARACTER_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.length > MAX_LENGTH
    ? `${sanitized.slice(0, MAX_LENGTH)}…`
    : sanitized;
}
