import { Option } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";

type Webhook = ArgosAPISchema.components["schemas"]["Webhook"];
type WebhookEvent = Webhook["events"][number];
type WebhookDeliveryStatus =
  ArgosAPISchema.components["schemas"]["WebhookDeliveryStatus"];

// A record rather than an array so the build fails when the API adds an event
// this list misses: `--events` must never reject an event the API accepts.
const WEBHOOK_EVENT_SET: Record<WebhookEvent, true> = {
  "build.completed": true,
  "build.reviewed": true,
  "deployment.created": true,
  "deployment.ready": true,
};

/** Every event a webhook can receive, in the order Argos lists them. */
export const WEBHOOK_EVENTS = Object.keys(WEBHOOK_EVENT_SET) as WebhookEvent[];

const WEBHOOK_DELIVERY_STATUSES = [
  "pending",
  "success",
  "failed",
] as const satisfies WebhookDeliveryStatus[];

export type CreateWebhookOptions = {
  url: string;
  events: WebhookEvent[];
  projects?: string[] | undefined;
};

export const webhookUrlOption = new Option(
  "--url <url>",
  "HTTPS endpoint Argos posts the events to",
).makeOptionMandatory();

export const webhookEventsOption = new Option(
  "--events <events...>",
  "Events the webhook receives",
)
  .choices(WEBHOOK_EVENTS)
  .makeOptionMandatory();

export const webhookProjectsOption = new Option(
  "--projects <names...>",
  "Names of the account's projects to receive the events of, e.g. web docs. Defaults to every project, including future ones",
);

/** Build the body of `createAccountWebhook` from the command's options. */
export function buildCreateWebhookBody(options: CreateWebhookOptions) {
  return {
    url: options.url,
    events: options.events,
    // Left out rather than sent as `null`: the API reads a missing value as
    // every project, so the default stays the API's to define.
    ...(options.projects ? { projects: options.projects } : {}),
  };
}

export type ListDeliveriesOptions = {
  status?: WebhookDeliveryStatus | undefined;
  eventId?: string | undefined;
};

export const deliveryStatusOption = new Option(
  "--status <status>",
  "Restrict to the deliveries with this status",
).choices(WEBHOOK_DELIVERY_STATUSES);

export const deliveryEventIdOption = new Option(
  "--event-id <eventId>",
  "Restrict to the deliveries of one event, such as a delivery and its resends",
);

/** The filters of `listWebhookDeliveries`, without the ones left unset. */
export function buildDeliveriesQuery(options: ListDeliveriesOptions) {
  return {
    ...(options.status ? { status: options.status } : {}),
    ...(options.eventId ? { eventId: options.eventId } : {}),
  };
}
