import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentDelete = defineCommentAction({
  name: "delete",
  description: "Delete a comment on a build (author only)",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
