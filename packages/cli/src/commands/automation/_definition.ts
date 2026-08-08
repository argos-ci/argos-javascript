import { readFile } from "node:fs/promises";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { fail } from "../../lib/cli-error";

export type AutomationRuleDefinition = NonNullable<
  ArgosAPISchema.operations["createAutomationRule"]["requestBody"]
>["content"]["application/json"];

export type DefinitionOptions = {
  definition?: string | undefined;
  definitionFile?: string | undefined;
};

/**
 * Resolve an automation rule definition from the mutually-exclusive
 * `--definition` (inline JSON) and `--definition-file` (path) options.
 *
 * The definition is passed through as-is: events, conditions and actions are
 * validated by the API, which owns their schemas.
 */
export async function resolveDefinition(
  options: DefinitionOptions,
): Promise<AutomationRuleDefinition> {
  const { definition, definitionFile } = options;

  if (definition !== undefined && definitionFile !== undefined) {
    fail("Use either --definition or --definition-file, not both.");
  }

  let raw: string;
  if (definition !== undefined) {
    raw = definition;
  } else if (definitionFile !== undefined) {
    try {
      raw = await readFile(definitionFile, "utf8");
    } catch (error) {
      fail(
        `Failed to read --definition-file "${definitionFile}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    fail(
      "A rule definition is required. Use --definition <json> or --definition-file <path>.",
    );
  }

  try {
    return JSON.parse(raw) as AutomationRuleDefinition;
  } catch (error) {
    fail(
      `Invalid rule definition JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
