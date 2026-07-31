import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentResolve = defineTestCommentAction({
  name: "resolve",
  description: "Mark a comment thread on a test as resolved",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/resolve",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
