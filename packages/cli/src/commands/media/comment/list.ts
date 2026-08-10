import type { ArgosAPISchema } from "@argos-ci/api-client";
import type { Command } from "commander";
import { Option } from "commander";
import { createApiClient, unwrap } from "../../../lib/api";
import { formatComments } from "../../../lib/format";
import { handleCliError, output } from "../../../lib/run";
import { resolveToken } from "../../../lib/target";
import { jsonOption, tokenOption, type JsonOption } from "../../../options";

type Comment = ArgosAPISchema.components["schemas"]["Comment"];

type ListOptions = JsonOption & {
  token?: string | undefined;
  all?: boolean | undefined;
};

export function registerMediaCommentList(comment: Command) {
  comment
    .command("list")
    .description(
      "List the open comment threads on a media — the feedback still to act on",
    )
    .argument("<mediaId>", "ID of the media")
    .addOption(
      new Option(
        "--all",
        "Include threads that are already resolved (by default only open ones are listed)",
      ),
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (mediaId: string, options: ListOptions) => {
      try {
        const client = createApiClient(await resolveToken(options));
        const result = unwrap(
          await client.GET("/media/{mediaId}/comments", {
            params: { path: { mediaId } },
          }),
        );
        // Filtered here rather than in the query: the endpoint returns a media's
        // whole history and takes no filter. Work already dealt with is not
        // feedback, and an agent told to act on a review must not redo it.
        output(
          options.all ? result : selectOpenThreads(result),
          options,
          formatComments,
        );
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}

/**
 * Drop resolved threads, replies included.
 *
 * `resolvedAt` is only set on a thread's root comment, so a reply has to be judged
 * by the thread it belongs to — otherwise answers to settled feedback come back
 * without the comment that settled it.
 */
function selectOpenThreads(comments: Comment[]): Comment[] {
  const resolved = new Set(
    comments
      .filter((comment) => comment.resolvedAt !== null)
      .map((comment) => comment.id),
  );
  return comments.filter(
    (comment) =>
      comment.resolvedAt === null &&
      !(comment.threadId !== null && resolved.has(comment.threadId)),
  );
}
