import { Option, type Command } from "commander";
import type { ArgosAPISchema, ArgosAPIClient } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { fail } from "../../lib/cli-error";
import { formatProject } from "../../lib/format";
import {
  jsonOption,
  managedProjectPathOption,
  tokenOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

type UpdateProjectBody = NonNullable<
  ArgosAPISchema.operations["updateProject"]["requestBody"]
>["content"]["application/json"];
type SummaryCheck = ArgosAPISchema.components["schemas"]["SummaryCheck"];
type DeploymentAuth = ArgosAPISchema.components["schemas"]["DeploymentAuth"];
type ProjectUserLevel =
  ArgosAPISchema.components["schemas"]["ProjectUserLevel"];

const BOOLEAN_CHOICES = ["true", "false"] as const;
type BooleanChoice = (typeof BOOLEAN_CHOICES)[number];

const SUMMARY_CHECKS = [
  "always",
  "never",
  "auto",
] as const satisfies SummaryCheck[];

const DEPLOYMENT_AUTHS = [
  "public",
  "domain-private",
  "private",
] as const satisfies DeploymentAuth[];

const PROJECT_USER_LEVELS = [
  "admin",
  "reviewer",
  "viewer",
] as const satisfies ProjectUserLevel[];

type UpdateOptions = ProjectCommandOptions & {
  name?: string | undefined;
  defaultBaseBranch?: string | undefined;
  autoApprovedBranchGlob?: string | undefined;
  deploymentProductionBranchGlob?: string | undefined;
  private?: BooleanChoice | "inherit" | undefined;
  summaryCheck?: SummaryCheck | undefined;
  defaultUserLevel?: ProjectUserLevel | "none" | undefined;
  ignoreChanges?: BooleanChoice | undefined;
  autoIgnoreAfter?: string | undefined;
  deployments?: BooleanChoice | undefined;
  deploymentAuth?: DeploymentAuth | undefined;
  githubActionsOidc?: BooleanChoice | undefined;
  tokenlessAuth?: BooleanChoice | undefined;
};

function toBoolean(value: BooleanChoice): boolean {
  return value === "true";
}

/** An empty string resets a nullable setting to its inherited default. */
function toNullable(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Build the `ignoreConfig` object. The API takes it whole, so a command that
 * touches only one of its two settings has to read the other back from the
 * project first.
 */
async function resolveIgnoreConfig(
  options: UpdateOptions,
  load: () => Promise<UpdateProjectBody["ignoreConfig"]>,
): Promise<UpdateProjectBody["ignoreConfig"]> {
  if (!options.ignoreChanges && !options.autoIgnoreAfter) {
    return undefined;
  }
  const current = await load();
  const enabled = options.ignoreChanges
    ? toBoolean(options.ignoreChanges)
    : (current?.enabled ?? true);
  if (!options.autoIgnoreAfter) {
    return { enabled, autoIgnore: current?.autoIgnore ?? null };
  }
  if (options.autoIgnoreAfter === "off") {
    return { enabled, autoIgnore: null };
  }
  const changes = Number(options.autoIgnoreAfter);
  if (!Number.isInteger(changes) || changes < 1) {
    fail(
      `--auto-ignore-after must be a positive integer or "off", received "${options.autoIgnoreAfter}".`,
    );
  }
  return { enabled, autoIgnore: { changes } };
}

/** Map the flags onto the request body, leaving untouched settings out. */
async function buildBody(
  options: UpdateOptions,
  load: () => Promise<UpdateProjectBody["ignoreConfig"]>,
): Promise<UpdateProjectBody> {
  const body: UpdateProjectBody = {};
  if (options.name !== undefined) {
    body.name = options.name;
  }
  if (options.defaultBaseBranch !== undefined) {
    body.defaultBaseBranch = toNullable(options.defaultBaseBranch);
  }
  if (options.autoApprovedBranchGlob !== undefined) {
    body.autoApprovedBranchGlob = toNullable(options.autoApprovedBranchGlob);
  }
  if (options.deploymentProductionBranchGlob !== undefined) {
    body.deploymentProductionBranchGlob = toNullable(
      options.deploymentProductionBranchGlob,
    );
  }
  if (options.private !== undefined) {
    body.private =
      options.private === "inherit" ? null : toBoolean(options.private);
  }
  if (options.summaryCheck !== undefined) {
    body.summaryCheck = options.summaryCheck;
  }
  if (options.defaultUserLevel !== undefined) {
    body.defaultUserLevel =
      options.defaultUserLevel === "none" ? null : options.defaultUserLevel;
  }
  if (options.deployments !== undefined) {
    body.deploymentEnabled = toBoolean(options.deployments);
  }
  if (options.deploymentAuth !== undefined) {
    body.deploymentAuth = options.deploymentAuth;
  }
  if (options.githubActionsOidc !== undefined) {
    body.githubActionsOidcEnabled = toBoolean(options.githubActionsOidc);
  }
  if (options.tokenlessAuth !== undefined) {
    body.tokenlessAuthEnabled = toBoolean(options.tokenlessAuth);
  }
  const ignoreConfig = await resolveIgnoreConfig(options, load);
  if (ignoreConfig !== undefined) {
    body.ignoreConfig = ignoreConfig;
  }
  return body;
}

/** Read the project's current ignore settings, to patch them partially. */
async function loadIgnoreConfig(
  client: ArgosAPIClient,
  owner: string,
  project: string,
): Promise<UpdateProjectBody["ignoreConfig"]> {
  const current = unwrap(
    await client.GET("/projects/{owner}/{project}", {
      params: { path: { owner, project } },
    }),
  );
  return current.ignoreConfig;
}

export function registerProjectUpdate(project: Command) {
  project
    .command("update")
    .description(
      "Update a project's settings. Only the settings you pass are changed",
    )
    .option("--name <name>", "Rename the project")
    .option(
      "--default-base-branch <branch>",
      "Branch used as the baseline when no better one applies. Pass an empty string to fall back to the repository default",
    )
    .option(
      "--auto-approved-branch-glob <glob>",
      "Glob matching the branches whose builds are approved automatically. Pass an empty string to fall back to the default base branch",
    )
    .option(
      "--deployment-production-branch-glob <glob>",
      "Glob matching the branches whose deployments count as production. Pass an empty string to fall back to the repository default",
    )
    .addOption(
      new Option(
        "--private <value>",
        "Force the project's privacy, or inherit it from the linked repository",
      ).choices([...BOOLEAN_CHOICES, "inherit"]),
    )
    .addOption(
      new Option(
        "--summary-check <mode>",
        "When to post the summary check on a pull request",
      ).choices(SUMMARY_CHECKS),
    )
    .addOption(
      new Option(
        "--default-user-level <level>",
        "Access given to team members that are not contributors on this project",
      ).choices([...PROJECT_USER_LEVELS, "none"]),
    )
    .addOption(
      new Option(
        "--ignore-changes <value>",
        "Whether changes can be ignored on this project",
      ).choices(BOOLEAN_CHOICES),
    )
    .option(
      "--auto-ignore-after <changes>",
      'Ignore a change automatically once it has reappeared this many times, or "off"',
    )
    .addOption(
      new Option(
        "--deployments <value>",
        "Whether deployments are served for this project",
      ).choices(BOOLEAN_CHOICES),
    )
    .addOption(
      new Option(
        "--deployment-auth <mode>",
        "Who can reach the project's deployments",
      ).choices(DEPLOYMENT_AUTHS),
    )
    .addOption(
      new Option(
        "--github-actions-oidc <value>",
        "Whether builds can authenticate with a GitHub Actions OIDC token",
      ).choices(BOOLEAN_CHOICES),
    )
    .addOption(
      new Option(
        "--tokenless-auth <value>",
        "Whether builds from forked pull requests can be uploaded without a token",
      ).choices(BOOLEAN_CHOICES),
    )
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: UpdateOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) => {
          const body = await buildBody(options, () =>
            loadIgnoreConfig(client, owner, name),
          );
          if (Object.keys(body).length === 0) {
            fail(
              "Nothing to update. Pass at least one setting — run `argos project update --help` for the list.",
            );
          }
          return unwrap(
            await client.PATCH("/projects/{owner}/{project}", {
              params: { path: { owner, project: name } },
              body,
            }),
          );
        },
        format: formatProject,
      }),
    );
}
