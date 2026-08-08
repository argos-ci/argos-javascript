import type { Command } from "commander";
import { registerChangeIgnore } from "./ignore";
import { registerChangeList } from "./list";
import { registerChangeUnignore } from "./unignore";

export function changeCommand(program: Command) {
  const change = program
    .command("change")
    .description("Ignore or unignore flaky test changes");
  registerChangeList(change);
  registerChangeIgnore(change);
  registerChangeUnignore(change);
}
