import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentUnsubscribe = defineCommentAction({
  name: "unsubscribe",
  description: "Unsubscribe from a comment thread's notifications",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.DELETE(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
