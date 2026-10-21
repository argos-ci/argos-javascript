import type { Command } from "commander";
import { registerBaselineDownload } from "./download";

export function baselineCommand(program: Command) {
  const baseline = program
    .command("baseline")
    .description("Export a project's baseline screenshots");
  registerBaselineDownload(baseline);
}
