import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentDelete = defineMediaCommentAction({
  name: "delete",
  description: "Delete a comment on a media (author only)",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.DELETE("/media/{mediaId}/comments/{commentId}", {
        params: { path: { mediaId, commentId } },
      }),
    ),
});
