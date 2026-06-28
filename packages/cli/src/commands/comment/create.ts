import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { parseAnchor } from "../../lib/anchor";
import { resolveBody } from "../../lib/body";
import { fail } from "../../lib/cli-error";
import { formatComment } from "../../lib/format";
import { runBuildAction, type BaseCommandOptions } from "../../lib/run";
import { jsonOption, projectPathOption, tokenOption } from "../../options";

type CommentCreateOptions = BaseCommandOptions & {
  body?: string;
  bodyFile?: string;
  replyTo?: string;
  diff?: string;
  anchorPoint?: string;
  anchorLines?: string;
  draft?: boolean;
};

export function registerCommentCreate(comment: Command) {
  comment
    .command("create")
    .description("Post a comment (or reply) on a build")
    .argument("<buildReference>", "Build number or Argos build URL")
    .option("--body <markdown>", "Markdown body of the comment")
    .option("--body-file <path>", "Read the comment body from a Markdown file")
    .option(
      "--reply-to <threadId>",
      "Reply to an existing thread (its root comment ID)",
    )
    .option(
      "--diff <screenshotDiffId>",
      "Anchor the comment to a screenshot diff",
    )
    .option(
      "--anchor-point <x,y>",
      "Point on the diff in normalized 0-1 coordinates (requires --diff)",
    )
    .option(
      "--anchor-lines <from,to>",
      "1-based inclusive line range on the diff (requires --diff)",
    )
    .option(
      "--draft",
      "Attach to your pending review instead of posting immediately",
    )
    .addOption(tokenOption)
    .addOption(projectPathOption)
    .addOption(jsonOption)
    .action((reference: string, options: CommentCreateOptions) =>
      runBuildAction({
        reference,
        options,
        auth: "user",
        handler: async ({ client, owner, project, buildNumber }) => {
          const body = await resolveBody(options, { required: true });
          const anchor = parseAnchor(options);
          if (anchor && !options.diff) {
            fail(
              "--anchor-point and --anchor-lines require --diff <screenshotDiffId>.",
            );
          }
          return unwrap(
            await client.POST(
              "/projects/{owner}/{project}/builds/{buildNumber}/comments",
              {
                params: { path: { owner, project, buildNumber } },
                body: {
                  body: body as string,
                  threadId: options.replyTo,
                  screenshotDiffId: options.diff,
                  anchor,
                  addToReview: options.draft,
                },
              },
            ),
          );
        },
        format: formatComment,
      }),
    );
}
