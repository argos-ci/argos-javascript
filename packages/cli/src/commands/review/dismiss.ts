import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatReview } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerReviewDismiss(review: Command) {
  review
    .command("dismiss")
    .description("Dismiss a submitted review on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument("<reviewId>", "ID of the review to dismiss")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (reference: string, reviewId: string, options: BaseCommandOptions) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) =>
            unwrap(
              await client.POST(
                "/projects/{owner}/{project}/builds/{buildNumber}/reviews/{reviewId}/dismiss",
                {
                  params: {
                    path: { owner, project, buildNumber, reviewId },
                  },
                },
              ),
            ),
          format: formatReview,
        }),
    );
}
