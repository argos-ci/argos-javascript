import { Option } from "commander";

export type ParallelNonceOption = { parallelNonce?: string | undefined };
export const parallelNonceOption = new Option(
  "--parallel-nonce <string>",
  "A unique ID for this parallel build",
);

export type TokenOption = { token?: string | undefined };
export const tokenOption = new Option("--token <token>", "Repository token");

export type ProjectOption = { project?: string | undefined };
export const projectOption = new Option(
  "--project <slug>",
  "Argos project slug (account/project), used to disambiguate tokenless authentication when multiple projects are linked to the same repository",
);

export type BuildNameOption = { buildName?: string | undefined };
export const buildNameOption = new Option(
  "--build-name <string>",
  "Name of the build, in case you want to run multiple Argos builds in a single CI job",
);

export type AccountOption = { account?: string | undefined };
export const accountOption = new Option(
  "--account <slug>",
  "Slug of the account (personal or team) that will own the project",
);

export type JsonOption = { json?: boolean | undefined };
export const jsonOption = new Option(
  "--json",
  "Output machine-readable JSON instead of human-readable text",
);

export type ProjectPathOption = { project?: string | undefined };
export const projectPathOption = new Option(
  "--project <owner/project>",
  "Project path in owner/project format. Required for build-number references on review and comment commands",
);
