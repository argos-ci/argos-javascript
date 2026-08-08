import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatProjectDomain } from "../../lib/format";
import {
  jsonOption,
  managedProjectPathOption,
  tokenOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

export function registerProjectDomain(project: Command) {
  const domain = project
    .command("domain")
    .description(
      "Read or set the domain a project's production deployments are served on",
    );

  domain
    .command("get")
    .description("Get a project's production deployment domain")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "project",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.GET("/projects/{owner}/{project}/domain", {
              params: { path: { owner, project: name } },
            }),
          ),
        format: formatProjectDomain,
      }),
    );

  domain
    .command("set")
    .description(
      "Set a project's production deployment domain. Only domains under the Argos deployments domain are accepted",
    )
    .argument("<domain>", "Full domain, e.g. acme-web.argos-ci.live")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((value: string, options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.PUT("/projects/{owner}/{project}/domain", {
              params: { path: { owner, project: name } },
              body: { domain: value },
            }),
          ),
        format: formatProjectDomain,
      }),
    );
}
