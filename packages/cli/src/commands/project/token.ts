import type { Command } from "commander";
import { unwrap, unwrapEmpty } from "../../lib/api";
import {
  formatCreatedProjectToken,
  formatProjectTokens,
} from "../../lib/format";
import {
  buildCreateTokenBody,
  tokenExpireAtOption,
  tokenExpiresInOption,
  tokenNameOption,
  tokenPermissionsOption,
  type CreateProjectTokenOptions,
} from "../../lib/project-token";
import {
  jsonOption,
  managedProjectPathOption,
  tokenOption,
} from "../../options";
import { runProjectAction, type ProjectCommandOptions } from "./_run";

export function registerProjectToken(project: Command) {
  const token = project
    .command("token")
    .description(
      "Manage the tokens CI authenticates with (ARGOS_TOKEN). To rotate one without downtime: create its replacement, update the CI secret, then revoke the old token",
    );

  token
    .command("list")
    .description(
      "List a project's tokens, including the ones linked to other projects too",
    )
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.GET("/projects/{owner}/{project}/tokens", {
              params: { path: { owner, project: name } },
            }),
          ),
        format: formatProjectTokens,
      }),
    );

  token
    .command("create")
    .description(
      "Create a token for a project and print it. It is shown only once: store it right away, e.g. as the ARGOS_TOKEN secret of your CI",
    )
    .addOption(tokenNameOption)
    .addOption(tokenPermissionsOption)
    .addOption(tokenExpireAtOption)
    .addOption(tokenExpiresInOption)
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: ProjectCommandOptions & CreateProjectTokenOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) =>
          unwrap(
            await client.POST("/projects/{owner}/{project}/tokens", {
              params: { path: { owner, project: name } },
              body: buildCreateTokenBody(options),
            }),
          ),
        format: formatCreatedProjectToken,
      }),
    );

  token
    .command("revoke")
    .description(
      "Revoke a project token. CI using it is rejected from its next request",
    )
    .argument("<tokenId>", "Token ID, taken from `argos project token list`")
    .addOption(managedProjectPathOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((tokenId: string, options: ProjectCommandOptions) =>
      runProjectAction({
        options,
        auth: "user",
        handler: async ({ client, owner, project: name }) => {
          unwrapEmpty(
            await client.DELETE(
              "/projects/{owner}/{project}/tokens/{tokenId}",
              {
                params: { path: { owner, project: name, tokenId } },
              },
            ),
          );
          return { revoked: true, tokenId };
        },
        format: ({ tokenId: revoked }) => `Revoked token ${revoked}.`,
      }),
    );
}
