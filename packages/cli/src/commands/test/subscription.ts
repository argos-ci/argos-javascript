import type { Command } from "commander";
import type { ArgosAPIClient, ArgosAPISchema } from "@argos-ci/api-client";
import { unwrap } from "../../lib/api";
import { formatSubscription } from "../../lib/format";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import { jsonOption, testProjectPathOption, tokenOption } from "../../options";

type NotificationSubscription =
  ArgosAPISchema.components["schemas"]["NotificationSubscription"];

/**
 * Register `test subscribe` / `test unsubscribe`. Both act as a user, so they
 * need a personal access token, and the project comes from `--project` or
 * `ARGOS_PROJECT` since a test id does not carry the account slug.
 */
function defineTestSubscription(opts: {
  name: string;
  description: string;
  perform: (ctx: {
    client: ArgosAPIClient;
    owner: string;
    project: string;
    testId: string;
  }) => Promise<NotificationSubscription>;
}) {
  return (test: Command) => {
    test
      .command(opts.name)
      .description(opts.description)
      .argument(
        "<testId>",
        "Test ID, taken from a diff's `test.id` (see `argos build snapshots`)",
      )
      .addOption(tokenOption)
      .addOption(testProjectPathOption)
      .addOption(jsonOption)
      .action(async (testId: string, options: BaseCommandOptions) => {
        try {
          const { client, owner, project } = await resolveProjectTarget(
            options,
            { auth: "user" },
          );
          const result = await opts.perform({
            client,
            owner,
            project,
            testId,
          });
          output(result, options, formatSubscription);
        } catch (error) {
          handleCliError(error, "user");
        }
      });
  };
}

export const registerTestSubscribe = defineTestSubscription({
  name: "subscribe",
  description:
    "Subscribe to a test's notifications — its new comments and the changes it produces",
  perform: async ({ client, owner, project, testId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/tests/{testId}/subscription",
        { params: { path: { owner, project, testId } } },
      ),
    ),
});

export const registerTestUnsubscribe = defineTestSubscription({
  name: "unsubscribe",
  description:
    "Stop receiving notifications about a test. Argos will not auto-subscribe you to it again",
  perform: async ({ client, owner, project, testId }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/tests/{testId}/subscription",
        { params: { path: { owner, project, testId } } },
      ),
    ),
});
