import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { program } from "commander";
import { updateGitLabCommitStatuses } from ".";
import { getConfig } from "./config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rawPkg = await readFile(resolve(__dirname, "..", "package.json"), "utf8");
const pkg = JSON.parse(rawPkg);

program
  .name(pkg.name)
  .description("Run Argos GitLab commands from the command line.")
  .version(pkg.version);

program
  .command("update-statuses")
  .description("Update GitLab commit statuses based on Argos builds.")
  .action(async () => {
    const config = getConfig();
    try {
      await updateGitLabCommitStatuses(config);
    } catch (error: any) {
      console.error(error.stack);
      process.exit(1);
    }
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
