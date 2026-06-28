import { unwrap } from "../../lib/api";
import { defineCommentAction } from "./_action";

export const registerCommentGet = defineCommentAction({
  name: "get",
  description: "Fetch a single comment on a build",
  perform: async ({ client, owner, project, buildNumber, commentId }) =>
    unwrap(
      await client.GET(
        "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}",
        { params: { path: { owner, project, buildNumber, commentId } } },
      ),
    ),
});
