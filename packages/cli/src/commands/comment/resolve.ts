import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentResolve = defineCommentAction({
  name: "resolve",
  description: "Mark a comment thread as resolved",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/resolve",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
