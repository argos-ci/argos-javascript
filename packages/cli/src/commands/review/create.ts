import type { Command } from "commander";
import { Option } from "commander";
import { unwrap } from "../../lib/api";
import { resolveBody } from "../../lib/body";
import { formatReview } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

const events = {
  approve: "APPROVE",
  reject: "REJECT",
  comment: "COMMENT",
} as const;
type EventName = keyof typeof events;

export function registerReviewCreate(review: Command) {
  review
    .command("create")
    .description("Submit a review on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(
      new Option("--event <event>", "Review event to apply to the build")
        .choices(Object.keys(events))
        .makeOptionMandatory(),
    )
    .option("--body <markdown>", "Markdown comment to attach to the review")
    .option(
      "--body-file <path>",
      "Read the review comment from a Markdown file",
    )
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (
        reference: string,
        options: BaseCommandOptions & {
          event: EventName;
          body?: string;
          bodyFile?: string;
        },
      ) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) => {
            const body = await resolveBody(options);
            return unwrap(
              await client.POST(
                "/projects/{owner}/{project}/builds/{buildNumber}/reviews",
                {
                  params: { path: { owner, project, buildNumber } },
                  body: { event: events[options.event], body },
                },
              ),
            );
          },
          format: formatReview,
        }),
    );
}
