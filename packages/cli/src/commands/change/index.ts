import type { Command } from "commander";
import { registerChangeIgnore } from "./ignore";
import { registerChangeUnignore } from "./unignore";

export function changeCommand(program: Command) {
  const change = program
    .command("change")
    .description("Ignore or unignore flaky test changes");
  registerChangeIgnore(change);
  registerChangeUnignore(change);
}
