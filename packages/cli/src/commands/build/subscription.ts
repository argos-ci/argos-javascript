import type { Command } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { formatSubscription } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import type { BuildTarget } from "../../lib/target";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

type NotificationSubscription =
  ArgosAPISchema.components["schemas"]["NotificationSubscription"];

/** Register `build subscribe` / `build unsubscribe`; both act as a user. */
function defineBuildSubscription(opts: {
  name: string;
  description: string;
  perform: (target: BuildTarget) => Promise<NotificationSubscription>;
}) {
  return (build: Command) => {
    build
      .command(opts.name)
      .description(opts.description)
      .argument("<buildReference>", "Build number or Argos build URL")
      .addOption(tokenOption)
      .addOption(projectPathOption)
      .addOption(jsonOption)
      .action((reference: string, options: BaseCommandOptions) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: opts.perform,
          format: formatSubscription,
        }),
      );
  };
}

export const registerBuildSubscribe = defineBuildSubscription({
  name: "subscribe",
  description:
    "Subscribe to a build's notifications — new comments, reviews, and status changes",
  perform: async ({ client, owner, project, buildNumber }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/builds/{buildNumber}/subscription",
        { params: { path: { owner, project, buildNumber } } },
      ),
    ),
});

export const registerBuildUnsubscribe = defineBuildSubscription({
  name: "unsubscribe",
  description:
    "Stop receiving notifications about a build. Argos will not auto-subscribe you to it again",
  perform: async ({ client, owner, project, buildNumber }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/builds/{buildNumber}/subscription",
        { params: { path: { owner, project, buildNumber } } },
      ),
    ),
});
