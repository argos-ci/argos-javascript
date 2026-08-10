import { unwrap } from "../../../lib/api";
import { defineMediaCommentAction } from "./_action";

export const registerMediaCommentGet = defineMediaCommentAction({
  name: "get",
  description: "Show a single comment on a media",
  perform: async ({ client, mediaId, commentId }) =>
    unwrap(
      await client.GET("/media/{mediaId}/comments/{commentId}", {
        params: { path: { mediaId, commentId } },
      }),
    ),
});
