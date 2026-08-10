import type { Command } from "commander";
import { registerMediaComment } from "./comment";
import { registerMediaDelete } from "./delete";
import { registerMediaGet } from "./get";
import { registerMediaList } from "./list";
import { registerMediaUpdate } from "./update";
import { registerMediaUpload } from "./upload";
import { registerMediaVersions } from "./versions";

export function mediaCommand(program: Command) {
  const media = program
    .command("media")
    .description(
      "Upload standalone images and videos to Argos and get shareable links to paste into pull requests",
    );
  registerMediaUpload(media);
  registerMediaList(media);
  registerMediaGet(media);
  registerMediaUpdate(media);
  registerMediaDelete(media);
  registerMediaVersions(media);
  registerMediaComment(media);
}
