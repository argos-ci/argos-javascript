import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { program } from "commander";
import { upload } from "@argos-ci/core";
import ora from "ora";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rawPkg = await readFile(resolve(__dirname, "..", "package.json"), "utf8");
const pkg = JSON.parse(rawPkg);

program
  .name(pkg.name)
  .description(
    "Interact with and upload screenshots to argos-ci.com via command line."
  )
  .version(pkg.version);

program
  .command("upload")
  .argument("<directory>", "Directory to upload")
  .description("Upload screenshots to argos-ci.com")
  .option(
    "-f, --files <patterns...>",
    "One or more globs matching image file paths to upload",
    "**/*.{png,jpg,jpeg}"
  )
  .option(
    "-i, --ignore <patterns...>",
    'One or more globs matching image file paths to ignore (ex: "**/*.png **/diff.jpg")'
  )
  .option("--token <token>", "Repository token")
  .option(
    "--build-name <string>",
    "Name of the build, in case you want to run multiple Argos builds in a single CI job"
  )
  .option(
    "--parallel",
    "Enable parallel mode. Run multiple Argos builds and combine them at the end"
  )
  .option("--parallel-total <number>", "The number of parallel nodes being ran")
  .option("--parallel-nonce <string>", "A unique ID for this parallel build")
  .action(async (directory, options) => {
    const spinner = ora("Uploading screenshots").start();
    try {
      const result = await upload({
        root: directory,
        buildName: options.buildName,
        files: options.files,
        ignore: options.ignore,
        prNumber: options.pullRequest ? Number(options.pullRequest) : undefined,
        parallel: options.parallel
          ? { nonce: options.parallelNonce, total: options.parallelTotal }
          : false,
      });
      spinner.succeed(`Build created: ${result.build.url}`);
    } catch (error: any) {
      spinner.fail(`Build failed: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    }
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
