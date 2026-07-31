import { unwrap } from "../../../lib/api";
import { defineTestCommentAction } from "./_action";

export const registerTestCommentGet = defineTestCommentAction({
  name: "get",
  description: "Fetch a single comment on a test",
  perform: async ({ client, owner, project, testId, commentId }) =>
    unwrap(
      await client.GET(
        "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}",
        { params: { path: { owner, project, testId, commentId } } },
      ),
    ),
});
