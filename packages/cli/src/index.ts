import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { program } from "commander";
import { uploadCommand } from "./commands/upload";
import { finalizeCommand } from "./commands/finalize";
import { skipCommand } from "./commands/skip";
import { buildCommand } from "./commands/build";
import { reviewCommand } from "./commands/review";
import { commentCommand } from "./commands/comment";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { deployCommand } from "./commands/deploy";

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
skipCommand(program);
finalizeCommand(program);
buildCommand(program);
reviewCommand(program);
commentCommand(program);
loginCommand(program);
logoutCommand(program);
deployCommand(program);

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
