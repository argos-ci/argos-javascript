import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentSubscribe = defineMediaCommentAction({
  name: "subscribe",
  description: "Subscribe to a comment thread's notifications",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.POST("/media/{mediaId}/comments/{commentId}/subscription", {
        params: { path: { mediaId, commentId } },
      }),
    ),
});
