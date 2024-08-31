import { Option } from "commander";

export const parallelNonce = new Option(
  "--parallel-nonce <string>",
  "A unique ID for this parallel build",
).env("ARGOS_PARALLEL_NONCE");
