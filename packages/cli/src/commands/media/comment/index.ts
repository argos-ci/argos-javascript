import type { Command } from "commander";
import { registerMediaCommentCreate } from "./create";
import { registerMediaCommentDelete } from "./delete";
import { registerMediaCommentEdit } from "./edit";
import { registerMediaCommentGet } from "./get";
import { registerMediaCommentList } from "./list";
import { registerMediaCommentReact } from "./react";
import { registerMediaCommentResolve } from "./resolve";
import { registerMediaCommentSubscribe } from "./subscribe";
import { registerMediaCommentUnreact } from "./unreact";
import { registerMediaCommentUnresolve } from "./unresolve";
import { registerMediaCommentUnsubscribe } from "./unsubscribe";

export function registerMediaComment(media: Command) {
  const comment = media
    .command("comment")
    .description(
      "List, post, and act on the comments left on a media — the feedback a human pinned to a spot on your screenshot",
    );
  registerMediaCommentList(comment);
  registerMediaCommentCreate(comment);
  registerMediaCommentGet(comment);
  registerMediaCommentEdit(comment);
  registerMediaCommentDelete(comment);
  registerMediaCommentResolve(comment);
  registerMediaCommentUnresolve(comment);
  registerMediaCommentReact(comment);
  registerMediaCommentUnreact(comment);
  registerMediaCommentSubscribe(comment);
  registerMediaCommentUnsubscribe(comment);
}
