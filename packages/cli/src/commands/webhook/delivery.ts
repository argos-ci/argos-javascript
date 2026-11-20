import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import {
  formatResentWebhookDelivery,
  formatWebhookDeliveries,
  formatWebhookDelivery,
} from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import {
  buildDeliveriesQuery,
  deliveryEventIdOption,
  deliveryStatusOption,
  type ListDeliveriesOptions,
} from "../../lib/webhook";
import {
  accountSlugOption,
  jsonOption,
  limitOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../options";
import { runAccountAction, type AccountCommandOptions } from "../account/_run";

const WEBHOOK_ID_DESCRIPTION = "Webhook ID, taken from `argos webhook list`";
const DELIVERY_ID_DESCRIPTION =
  "Delivery ID, taken from `argos webhook delivery list`";

export function registerWebhookDelivery(webhook: Command) {
  const delivery = webhook
    .command("delivery")
    .description(
      "Inspect the events sent to a webhook and resend them. Argos keeps deliveries 7 days",
    );

  delivery
    .command("list")
    .description("List a webhook's deliveries, most recent first")
    .argument("<webhookId>", WEBHOOK_ID_DESCRIPTION)
    .addOption(deliveryStatusOption)
    .addOption(deliveryEventIdOption)
    .addOption(limitOption)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (
        webhookId: string,
        options: AccountCommandOptions & LimitOption & ListDeliveriesOptions,
      ) =>
        runAccountAction({
          options,
          handler: ({ client, accountSlug }) =>
            fetchPages(toLimit(options.limit), async (pagination) =>
              unwrap(
                await client.GET(
                  "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries",
                  {
                    params: {
                      path: { accountSlug, webhookId },
                      query: {
                        ...pagination,
                        ...buildDeliveriesQuery(options),
                      },
                    },
                  },
                ),
              ),
            ),
          format: formatWebhookDeliveries,
        }),
    );

  delivery
    .command("get")
    .description(
      "Fetch a delivery with the request Argos sent and the start of the response it got",
    )
    .argument("<webhookId>", WEBHOOK_ID_DESCRIPTION)
    .argument("<deliveryId>", DELIVERY_ID_DESCRIPTION)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (webhookId: string, deliveryId: string, options: AccountCommandOptions) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.GET(
                "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}",
                { params: { path: { accountSlug, webhookId, deliveryId } } },
              ),
            ),
          format: formatWebhookDelivery,
        }),
    );

  delivery
    .command("resend")
    .description(
      "Send a delivery's event to the webhook again, as a new delivery. It keeps the event's webhook-id header, so an endpoint that already processed the event can skip it",
    )
    .argument("<webhookId>", WEBHOOK_ID_DESCRIPTION)
    .argument("<deliveryId>", DELIVERY_ID_DESCRIPTION)
    .addOption(accountSlugOption)
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(
      (webhookId: string, deliveryId: string, options: AccountCommandOptions) =>
        runAccountAction({
          options,
          handler: async ({ client, accountSlug }) =>
            unwrap(
              await client.POST(
                "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}/resend",
                { params: { path: { accountSlug, webhookId, deliveryId } } },
              ),
            ),
          format: formatResentWebhookDelivery,
        }),
    );
}
