import { readFile } from "node:fs/promises";
import { fail } from "./cli-error";

export type BodyOptions = {
  body?: string | undefined;
  bodyFile?: string | undefined;
};

/**
 * Resolve the Markdown body of a comment or review from the mutually-exclusive
 * `--body` (inline) and `--body-file` (path) options.
 *
 * The Argos API also accepts a rich-text JSON document, but that form is only
 * needed for `@mentions` (which require user ids); the CLI exposes Markdown
 * only, which the API converts server-side.
 */
export async function resolveBody(
  options: BodyOptions,
  { required = false }: { required?: boolean } = {},
): Promise<string | undefined> {
  const { body, bodyFile } = options;

  if (body !== undefined && bodyFile !== undefined) {
    fail("Use either --body or --body-file, not both.");
  }

  if (body !== undefined) {
    return body;
  }

  if (bodyFile !== undefined) {
    try {
      return await readFile(bodyFile, "utf8");
    } catch (error) {
      fail(
        `Failed to read --body-file "${bodyFile}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (required) {
    fail(
      "A comment body is required. Use --body <markdown> or --body-file <path>.",
    );
  }

  return undefined;
}
