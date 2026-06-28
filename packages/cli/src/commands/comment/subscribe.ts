import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentSubscribe = defineCommentAction({
  name: "subscribe",
  description: "Subscribe to a comment thread's notifications",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.POST(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
