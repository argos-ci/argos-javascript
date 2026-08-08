import type { Command } from "commander";
import { registerMediaDelete } from "./delete";
import { registerMediaGet } from "./get";
import { registerMediaList } from "./list";
import { registerMediaUpload } from "./upload";

export function mediaCommand(program: Command) {
  const media = program
    .command("media")
    .description(
      "Upload standalone images and videos to Argos and get shareable links to paste into pull requests",
    );
  registerMediaUpload(media);
  registerMediaList(media);
  registerMediaGet(media);
  registerMediaDelete(media);
}
