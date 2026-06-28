import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentUnresolve = defineCommentAction({
  name: "unresolve",
  description: "Reopen a resolved comment thread",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/unresolve",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
