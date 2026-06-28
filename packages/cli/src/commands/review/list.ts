import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatReviews } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerReviewList(review: Command) {
  review
    .command("list")
    .description("List the reviews submitted on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action((reference: string, options: BaseCommandOptions) =>
      runBuildAction({
        reference,
        options,
        auth: "user",
        handler: async ({ client, owner, project, buildNumber }) =>
          unwrap(
            await client.GET(
              "/projects/{owner}/{project}/builds/{buildNumber}/reviews",
              { params: { path: { owner, project, buildNumber } } },
            ),
          ),
        format: formatReviews,
      }),
    );
}
