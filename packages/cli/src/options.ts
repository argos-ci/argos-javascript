import { Option } from "commander";

export type ParallelNonceOption = { parallelNonce?: string | undefined };
export const parallelNonceOption = new Option(
  "--parallel-nonce <string>",
  "A unique ID for this parallel build",
).env("ARGOS_PARALLEL_NONCE");

export type TokenOption = { token?: string | undefined };
export const tokenOption = new Option(
  "--token <token>",
  "Repository token",
).env("ARGOS_TOKEN");

export type BuildNameOption = { buildName?: string | undefined };
export const buildNameOption = new Option(
  "--build-name <string>",
  "Name of the build, in case you want to run multiple Argos builds in a single CI job",
).env("ARGOS_BUILD_NAME");
