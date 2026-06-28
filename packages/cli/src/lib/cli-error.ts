/**
 * Error whose message is meant to be shown to the user verbatim (prefixed with
 * `Error: `) before the CLI exits with a non-zero code. Throw it — via
 * {@link fail} — instead of calling `process.exit` directly so the failure can
 * be unit-tested and handled in a single place ({@link handleCliError}).
 */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

/**
 * Abort the current command with a user-facing message.
 */
export function fail(message: string): never {
  throw new CliError(message);
}
