import type { Command } from "commander";
import { Option } from "commander";
import { unwrap } from "../../lib/api";
import { formatMediaFeedback } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  jsonOption,
  mediaProjectPathOption,
  tokenOption,
  type JsonOption,
} from "../../options";

type FeedbackOptions = JsonOption & {
  token?: string | undefined;
  project?: string | undefined;
  pr?: number | undefined;
  all?: boolean | undefined;
};

export function registerMediaFeedback(media: Command) {
  media
    .command("feedback")
    .description(
      "Read every comment left on a project's media, grouped by media — the review to act on, in one call",
    )
    .addOption(
      new Option(
        "--pr <number>",
        "Only media attached to this pull request",
      ).argParser(Number),
    )
    .addOption(
      new Option(
        "--all",
        "Include threads that are already resolved (by default only open ones are shown)",
      ),
    )
    .addOption(tokenOption)
    .addOption(mediaProjectPathOption)
    .addOption(jsonOption)
    .action(async (options: FeedbackOptions) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "project",
        });
        const result = unwrap(
          await client.GET("/projects/{owner}/{project}/media/comments", {
            params: {
              path: { owner, project },
              query: {
                ...(options.pr === undefined
                  ? {}
                  : { prNumber: String(options.pr) }),
                // Open threads are the default: work already dealt with is not
                // feedback, and an agent asked to act on a review should not
                // re-do it.
                ...(options.all ? {} : { resolved: "false" as const }),
              },
            },
          }),
        );
        output(result, options, formatMediaFeedback);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
