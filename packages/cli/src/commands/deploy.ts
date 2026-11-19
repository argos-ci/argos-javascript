import { resolve } from "node:path";
import type { Command } from "commander";
import { Option } from "commander";
import { deploy } from "@argos-ci/core";
import ora from "ora";
import { fail } from "../lib/cli-error";
import { handleCliError } from "../lib/run";
import {
  projectOption,
  tokenOption,
  type ProjectOption,
  type TokenOption,
} from "../options";

type DeployOptions = TokenOption &
  ProjectOption & {
    prod?: boolean;
    url?: string | undefined;
  };

/** What `argos deploy` sends to Argos: files to host, or where it is hosted. */
export type DeploySource = { root: string } | { url: string };

/**
 * Resolve the `[directory]` argument and `--url` option into what to deploy,
 * or abort: exactly one of them is required.
 */
export function getDeploySource(
  directory: string | undefined,
  url: string | undefined,
): DeploySource {
  if (directory !== undefined && url !== undefined) {
    fail(
      "Pass a directory or --url, not both. A directory deploys a static build on Argos; --url reports a deployment hosted elsewhere.",
    );
  }
  if (url !== undefined) {
    if (!isHttpUrl(url)) {
      fail(
        `Invalid --url value: "${url}". Use the full URL of the deployment, starting with https:// or http://.`,
      );
    }
    return { url };
  }
  if (directory === undefined) {
    fail(
      "Missing directory or --url. Pass a directory to deploy a static build on Argos, or --url to report a deployment hosted elsewhere.",
    );
  }
  return { root: resolve(directory) };
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function deployCommand(program: Command) {
  program
    .command("deploy")
    .argument("[directory]", "Directory of the static build to deploy on Argos")
    .description(
      "Deploy a static build (Storybook or any static site) to Argos, or report a deployment hosted elsewhere",
    )
    .addOption(
      new Option(
        "--url <url>",
        "URL of a deployment hosted elsewhere, such as a Vercel or Netlify preview. Argos links it to the builds of the same commit, and links each screenshot to the same page on it",
      ),
    )
    .addOption(tokenOption)
    .addOption(projectOption)
    .addOption(
      new Option(
        "--prod",
        "Mark the deployment as production. When omitted, Argos infers the environment from the branch",
      ).default(false),
    )
    .addHelpText(
      "after",
      [
        "",
        "Examples:",
        "  argos deploy ./storybook-static",
        "  argos deploy --url https://my-app-git-feature.vercel.app",
      ].join("\n"),
    )
    .action(async (directory: string | undefined, options: DeployOptions) => {
      let source: DeploySource;
      try {
        source = getDeploySource(directory, options.url);
      } catch (error) {
        handleCliError(error);
      }
      const isExternal = "url" in source;
      const spinner = ora(
        isExternal ? "Reporting deployment" : "Deploying",
      ).start();
      try {
        const result = await deploy({
          token: options.token,
          project: options.project,
          environment: options.prod ? "production" : undefined,
          ...source,
        });
        spinner.succeed(
          isExternal
            ? `Deployment reported: ${result.url}`
            : `Deployed: ${result.url}`,
        );
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(
            isExternal
              ? `Could not report the deployment: ${error.message}`
              : `Deploy failed: ${error.message}`,
          );
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
