import type { Command } from "commander";
import { registerTestCommentCreate } from "./create";
import { registerTestCommentDelete } from "./delete";
import { registerTestCommentEdit } from "./edit";
import { registerTestCommentGet } from "./get";
import { registerTestCommentList } from "./list";
import { registerTestCommentReact } from "./react";
import { registerTestCommentResolve } from "./resolve";
import { registerTestCommentSubscribe } from "./subscribe";
import { registerTestCommentUnreact } from "./unreact";
import { registerTestCommentUnresolve } from "./unresolve";
import { registerTestCommentUnsubscribe } from "./unsubscribe";

export function registerTestComment(test: Command) {
  const comment = test
    .command("comment")
    .description("List, post, and act on comments left on a test");
  registerTestCommentList(comment);
  registerTestCommentCreate(comment);
  registerTestCommentGet(comment);
  registerTestCommentEdit(comment);
  registerTestCommentDelete(comment);
  registerTestCommentResolve(comment);
  registerTestCommentUnresolve(comment);
  registerTestCommentReact(comment);
  registerTestCommentUnreact(comment);
  registerTestCommentSubscribe(comment);
  registerTestCommentUnsubscribe(comment);
}
