import type { Command } from "commander";
import { registerReviewCreate } from "./create";
import { registerReviewDismiss } from "./dismiss";
import { registerReviewList } from "./list";

export function reviewCommand(program: Command) {
  const review = program
    .command("review")
    .description("List, submit, and dismiss build reviews");
  registerReviewList(review);
  registerReviewCreate(review);
  registerReviewDismiss(review);
}
