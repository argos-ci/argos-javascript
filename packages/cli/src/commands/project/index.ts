import type { Command } from "commander";
import { registerProjectContributor } from "./contributor";
import { registerProjectDeployments } from "./deployments";
import { registerProjectDomain } from "./domain";
import { registerProjectGet } from "./get";
import { registerProjectTransfer } from "./transfer";
import { registerProjectUpdate } from "./update";

export function projectCommand(program: Command) {
  const project = program
    .command("project")
    .description(
      "Inspect and configure a project: settings, contributors, deployments, and its deployment domain",
    );
  registerProjectGet(project);
  registerProjectUpdate(project);
  registerProjectTransfer(project);
  registerProjectContributor(project);
  registerProjectDeployments(project);
  registerProjectDomain(project);
}
