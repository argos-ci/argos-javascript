import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentUnresolve = defineMediaCommentAction({
  name: "unresolve",
  description: "Reopen a resolved comment thread",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.POST("/media/{mediaId}/comments/{commentId}/unresolve", {
        params: { path: { mediaId, commentId } },
      }),
    ),
});
