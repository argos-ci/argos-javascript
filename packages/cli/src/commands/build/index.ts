import type { Command } from "commander";
import { registerBuildGet } from "./get";
import { registerBuildSnapshots } from "./snapshots";
import {
  registerBuildSubscribe,
  registerBuildUnsubscribe,
} from "./subscription";

export function buildCommand(program: Command) {
  const build = program.command("build").description("Inspect Argos builds");
  registerBuildGet(build);
  registerBuildSnapshots(build);
  registerBuildSubscribe(build);
  registerBuildUnsubscribe(build);
}
