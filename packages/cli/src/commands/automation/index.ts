import { Option, type Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatAutomationRule, formatAutomationRules } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import {
  jsonOption,
  limitOption,
  managedProjectPathOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "../project/_run";
import { resolveDefinition, type DefinitionOptions } from "./_definition";

const ACTIVE_CHOICES = ["true", "false"] as const;

const definitionOption = new Option(
  "--definition <json>",
  "Rule definition as JSON: name, events, conditions, actions",
);

const definitionFileOption = new Option(
  "--definition-file <path>",
  "Read the rule definition from a JSON file",
);

const EXAMPLE_DEFINITION = `Example definition:
  {
    "name": "Notify on regressions",
    "events": ["build.completed"],
    "conditions": [{ "type": "build-conclusion", "value": "changes-detected" }],
    "actions": [{ "type": "sendSlackMessage", "payload": { "name": "argos-alerts" } }]
  }`;

export function automationCommand(program: Command) {
  const automation = program
    .command("automation")
    .description(
      "List and manage a project's automation rules — the actions Argos runs when a build event matches",
    );

  automation
    .command("list")
    .description("List a project's automation rules, most recent first")
    .addOption(
      new Option(
        "--active <value>",
        "Restrict to rules that still fire, or to deactivated ones",
      ).choices(ACTIVE_CHOICES),
    )
    .addOption(limitOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        options: ProjectCommandOptions &
          LimitOption & { active?: (typeof ACTIVE_CHOICES)[number] },
      ) =>
        runProjectAction({
          options,
          auth: "user",
          handler: ({ client, owner, project }) =>
            fetchPages(toLimit(options.limit), async (pagination) =>
              unwrap(
                await client.GET(
                  "/projects/{owner}/{project}/automation-rules",
                  {
                    params: {
                      path: { owner, project },
                      query: {
                        ...pagination,
                        ...(options.active ? { active: options.active } : {}),
                      },
                    },
                  },
                ),
              ),
            ),
          format: formatAutomationRules,
        }),
    );

  automation
    .command("get")
    .description("Fetch a single automation rule")
    .argument("<ruleId>", "Rule ID, taken from `argos automation list`")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((ruleId: string, options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project }) =>
          unwrap(
            await client.GET(
              "/projects/{owner}/{project}/automation-rules/{ruleId}",
              { params: { path: { owner, project, ruleId } } },
            ),
          ),
        format: formatAutomationRule,
      }),
    );

  automation
    .command("create")
    .description("Create an automation rule on a project")
    .addHelpText("after", `\n${EXAMPLE_DEFINITION}\n`)
    .addOption(definitionOption)
    .addOption(definitionFileOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions & DefinitionOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project }) => {
          const body = await resolveDefinition(options);
          return unwrap(
            await client.POST("/projects/{owner}/{project}/automation-rules", {
              params: { path: { owner, project } },
              body,
            }),
          );
        },
        format: formatAutomationRule,
      }),
    );

  automation
    .command("update")
    .description(
      "Replace an automation rule's definition. Send the events, conditions and actions you want the rule to end up with",
    )
    .argument("<ruleId>", "Rule ID, taken from `argos automation list`")
    .addHelpText("after", `\n${EXAMPLE_DEFINITION}\n`)
    .addOption(definitionOption)
    .addOption(definitionFileOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (ruleId: string, options: ProjectCommandOptions & DefinitionOptions) =>
        runProjectAction({
          options,
          auth: "user",
          handler: async ({ client, owner, project }) => {
            const body = await resolveDefinition(options);
            return unwrap(
              await client.PUT(
                "/projects/{owner}/{project}/automation-rules/{ruleId}",
                { params: { path: { owner, project, ruleId } }, body },
              ),
            );
          },
          format: formatAutomationRule,
        }),
    );

  automation
    .command("deactivate")
    .description(
      "Stop a rule from firing. Rules are never deleted — a deactivated one keeps its run history",
    )
    .argument("<ruleId>", "Rule ID, taken from `argos automation list`")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((ruleId: string, options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project }) =>
          unwrap(
            await client.POST(
              "/projects/{owner}/{project}/automation-rules/{ruleId}/deactivate",
              { params: { path: { owner, project, ruleId } } },
            ),
          ),
        format: formatAutomationRule,
      }),
    );
}
