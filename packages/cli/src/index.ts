import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { program } from "commander";
import { uploadCommand } from "./commands/upload";
import { finalizeCommand } from "./commands/finalize";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rawPkg = await readFile(resolve(__dirname, "..", "package.json"), "utf8");
const pkg = JSON.parse(rawPkg);

program
  .name(pkg.name)
  .description(
    "Interact with and upload screenshots to Argos via command line.",
  )
  .version(pkg.version);

uploadCommand(program);
finalizeCommand(program);

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
