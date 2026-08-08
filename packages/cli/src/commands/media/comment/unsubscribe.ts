import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentUnsubscribe = defineMediaCommentAction({
  name: "unsubscribe",
  description: "Stop receiving notifications for a comment thread",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.DELETE(
        "/media/{mediaId}/comments/{commentId}/subscription",
        {
          params: { path: { mediaId, commentId } },
        },
      ),
    ),
});
