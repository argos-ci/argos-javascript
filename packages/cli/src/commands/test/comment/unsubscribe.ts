import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentUnsubscribe = defineTestCommentAction({
  name: "unsubscribe",
  description: "Stop following a comment thread on a test",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/subscription",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
