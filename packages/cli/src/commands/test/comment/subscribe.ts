import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentSubscribe = defineTestCommentAction({
  name: "subscribe",
  description: "Follow a comment thread on a test to get notified of replies",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/subscription",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
