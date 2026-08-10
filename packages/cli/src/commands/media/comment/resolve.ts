import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentResolve = defineMediaCommentAction({
  name: "resolve",
  description:
    "Mark a comment thread as resolved — what to call once you have acted on the feedback",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.POST("/media/{mediaId}/comments/{commentId}/resolve", {
        params: { path: { mediaId, commentId } },
      }),
    ),
});
