import type { Command } from "commander";
import { unwrap, unwrapEmpty } from "../../lib/api";
import {
  formatCreatedWebhook,
  formatWebhook,
  formatWebhooks,
} from "../../lib/format";
import {
  buildCreateWebhookBody,
  webhookEventsOption,
  webhookProjectsOption,
  webhookUrlOption,
  type CreateWebhookOptions,
} from "../../lib/webhook";
import { accountSlugOption, jsonOption, tokenOption } from "../../options";
import { runAccountAction, type AccountCommandOptions } from "../account/_run";
import { registerWebhookDelivery } from "./delivery";

export function webhookCommand(program: Command) {
  const webhook = program
    .command("webhook")
    .description(
      "Manage the webhooks Argos posts an account's build and deployment events to, and inspect or resend their deliveries. Requires administrator access to the account",
    );

  webhook
    .command("list")
    .description("List an account's webhooks, newest first")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.GET("/accounts/{accountSlug}/webhooks", {
              params: { path: { accountSlug } },
            }),
          ),
        format: formatWebhooks,
      }),
    );

  webhook
    .command("get")
    .description("Fetch a single webhook")
    .argument("<webhookId>", "Webhook ID, taken from `argos webhook list`")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((webhookId: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.GET("/accounts/{accountSlug}/webhooks/{webhookId}", {
              params: { path: { accountSlug, webhookId } },
            }),
          ),
        format: formatWebhook,
      }),
    );

  webhook
    .command("create")
    .description(
      "Create a webhook and print its signing secret. It is shown only once: store it right away",
    )
    .addOption(webhookUrlOption)
    .addOption(webhookEventsOption)
    .addOption(webhookProjectsOption)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((options: AccountCommandOptions & CreateWebhookOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) =>
          unwrap(
            await client.POST("/accounts/{accountSlug}/webhooks", {
              params: { path: { accountSlug } },
              body: buildCreateWebhookBody(options),
            }),
          ),
        format: formatCreatedWebhook,
      }),
    );

  webhook
    .command("delete")
    .description(
      "Delete a webhook. Argos stops sending it events, including the deliveries waiting for a retry",
    )
    .argument("<webhookId>", "Webhook ID, taken from `argos webhook list`")
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action((webhookId: string, options: AccountCommandOptions) =>
      runAccountAction({
        options,
        handler: async ({ client, accountSlug }) => {
          unwrapEmpty(
            await client.DELETE(
              "/accounts/{accountSlug}/webhooks/{webhookId}",
              { params: { path: { accountSlug, webhookId } } },
            ),
          );
          return { deleted: true, webhookId };
        },
        format: ({ webhookId: deleted }) => `Deleted webhook ${deleted}.`,
      }),
    );

  registerWebhookDelivery(webhook);
}
