import type { Command } from "commander";
import { registerCommentCreate } from "./create";
import { registerCommentDelete } from "./delete";
import { registerCommentEdit } from "./edit";
import { registerCommentGet } from "./get";
import { registerCommentList } from "./list";
import { registerCommentReact } from "./react";
import { registerCommentResolve } from "./resolve";
import { registerCommentSubscribe } from "./subscribe";
import { registerCommentUnreact } from "./unreact";
import { registerCommentUnresolve } from "./unresolve";
import { registerCommentUnsubscribe } from "./unsubscribe";

export function commentCommand(program: Command) {
  const comment = program
    .command("comment")
    .description("List, post, and act on build comments");
  registerCommentList(comment);
  registerCommentCreate(comment);
  registerCommentGet(comment);
  registerCommentEdit(comment);
  registerCommentDelete(comment);
  registerCommentResolve(comment);
  registerCommentUnresolve(comment);
  registerCommentReact(comment);
  registerCommentUnreact(comment);
  registerCommentSubscribe(comment);
  registerCommentUnsubscribe(comment);
}
