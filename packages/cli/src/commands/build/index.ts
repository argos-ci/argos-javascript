import type { Command } from "commander";
import { registerBuildDownload } from "./download";
import { registerBuildGet } from "./get";
import { registerBuildList } from "./list";
import { registerBuildSnapshots } from "./snapshots";
import {
  registerBuildSubscribe,
  registerBuildUnsubscribe,
} from "./subscription";

export function buildCommand(program: Command) {
  const build = program
    .command("build")
    .description("Inspect and download Argos builds");
  registerBuildList(build);
  registerBuildGet(build);
  registerBuildSnapshots(build);
  registerBuildDownload(build);
  registerBuildSubscribe(build);
  registerBuildUnsubscribe(build);
}
