import type { Command } from "commander";
import { registerDocsSearch } from "./search";

export function docsCommand(program: Command) {
  const docs = program
    .command("docs")
    .description("Search the Argos documentation from the terminal");
  registerDocsSearch(docs);
}
