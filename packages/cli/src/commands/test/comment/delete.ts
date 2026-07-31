import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentDelete = defineTestCommentAction({
  name: "delete",
  description: "Delete a comment on a test (author or project admin)",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
