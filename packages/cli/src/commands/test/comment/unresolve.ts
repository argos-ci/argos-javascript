import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentUnresolve = defineTestCommentAction({
  name: "unresolve",
  description: "Reopen a resolved comment thread on a test",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/unresolve",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
