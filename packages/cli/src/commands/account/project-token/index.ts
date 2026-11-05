import { Option, type Command } from "commander";
import { unwrap, unwrapEmpty } from "../../../lib/api";
import {
  formatCreatedProjectToken,
  formatProjectTokens,
} from "../../../lib/format";
import {
  buildCreateTokenBody,
  tokenExpireAtOption,
  tokenExpiresInOption,
  tokenNameOption,
  tokenPermissionsOption,
  type CreateProjectTokenOptions,
} from "../../../lib/project-token";
import { accountSlugOption, jsonOption, tokenOption } from "../../../options";
import { runAccountAction, type AccountCommandOptions } from "../_run";

export function registerAccountProjectToken(account: Command) {
  const projectToken = account
    .command("project-token")
    .description(
      "Manage every project token of an account, including the ones linked to several projects. Requires administrator access to the account",
    );

  projectToken
    .command("list")
    .description(
      "List an account's project tokens, whatever projects they are linked to",
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.GET("/accounts/{accountSlug}/project-tokens", {
              params: { path: { accountSlug } },
            }),
          ),
        format: formatProjectTokens,
      }),
    );

  projectToken
    .command("create")
    .description(
      "Create a project token linked to one or more projects of the account and print it. It is shown only once: store it right away. CI using a token linked to several projects must set ARGOS_PROJECT",
    )
    .addOption(
      new Option(
        "--projects <names...>",
        "Names of the account's projects to link, e.g. web docs",
      ).makeOptionMandatory(),
    )
    .addOption(tokenNameOption)
    .addOption(tokenPermissionsOption)
    .addOption(tokenExpireAtOption)
    .addOption(tokenExpiresInOption)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        options: AccountCommandOptions &
          CreateProjectTokenOptions & { projects: string[] },
      ) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.POST("/accounts/{accountSlug}/project-tokens", {
                params: { path: { accountSlug } },
                body: {
                  ...buildCreateTokenBody(options),
                  projects: options.projects,
                },
              }),
            ),
          format: formatCreatedProjectToken,
        }),
    );

  projectToken
    .command("revoke")
    .description(
      "Revoke a project token of the account. CI using it is rejected from its next request",
    )
    .argument(
      "<tokenId>",
      "Token ID, taken from `argos account project-token list`",
    )
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((tokenId: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) => {
          unwrapEmpty(
            await client.DELETE(
              "/accounts/{accountSlug}/project-tokens/{tokenId}",
              { params: { path: { accountSlug, tokenId } } },
            ),
          );
          return { revoked: true, tokenId };
        },
        format: ({ tokenId: revoked }) => `Revoked token ${revoked}.`,
      }),
    );
}
