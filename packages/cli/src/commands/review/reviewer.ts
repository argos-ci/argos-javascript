import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatReviewers } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

export function registerReviewReviewer(review: Command) {
  const reviewer = review
    .command("reviewer")
    .description("List, request, and cancel review requests on a build");

  reviewer
    .command("list")
    .description("List the users currently requested to review a build")
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
              "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
              { params: { path: { owner, project, buildNumber } } },
            ),
          ),
        format: formatReviewers,
      }),
    );

  reviewer
    .command("add")
    .description(
      "Request users to review a build. Users already requested are left untouched and not notified again",
    )
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument(
      "<userIds...>",
      "User IDs to request, taken from `argos account member list` or `argos whoami`",
    )
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (reference: string, userIds: string[], options: BaseCommandOptions) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) =>
            unwrap(
              await client.POST(
                "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
                {
                  params: { path: { owner, project, buildNumber } },
                  body: { userIds },
                },
              ),
            ),
          format: formatReviewers,
        }),
    );

  reviewer
    .command("remove")
    .description("Cancel the review requests standing on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .argument("<userIds...>", "User IDs whose review request to cancel")
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action(
      (reference: string, userIds: string[], options: BaseCommandOptions) =>
        runBuildAction({
          reference,
          options,
          auth: "user",
          handler: async ({ client, owner, project, buildNumber }) =>
            unwrap(
              await client.DELETE(
                "/projects/{owner}/{project}/builds/{buildNumber}/reviewers",
                {
                  params: { path: { owner, project, buildNumber } },
                  body: { userIds },
                },
              ),
            ),
          format: formatReviewers,
        }),
    );
}
