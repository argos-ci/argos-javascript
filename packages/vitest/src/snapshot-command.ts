import type { BrowserCommand } from "vitest/node";
import type { ArgosAttachment } from "@argos-ci/playwright";
import { getBrowserSuffix } from "@argos-ci/util";
import type { TestMetadata } from "./metadata";
import type {
  ArgosVitestPluginOptions,
  SerializableSnapshotOptions,
} from "./options";
import { writeSnapshotFile } from "./snapshot-file";
import type { StorybookContext } from "./storybook";

/**
 * Arguments of the `argosSnapshot` browser command.
 * Only serializable values cross the browser/node RPC boundary — the value is
 * already serialized to a string on the browser side.
 */
export type ArgosSnapshotCommandArgs = [
  name: string,
  content: string,
  options?: SerializableSnapshotOptions,
  test?: TestMetadata,
  captureIndex?: number | null,
  storybook?: StorybookContext | null,
];

/**
 * Create the `argosSnapshot` browser command used to write serialized snapshots
 * from Vitest browser tests. The serialized string is produced on the browser
 * side and this command writes it (and its metadata) to disk on the Node side.
 */
export const createArgosSnapshotCommand = (
  pluginOptions: ArgosVitestPluginOptions = {},
): BrowserCommand<ArgosSnapshotCommandArgs> => {
  return async (
    ctx,
    name,
    content,
    options,
    test,
    captureIndex,
    storybook,
  ): Promise<ArgosAttachment[]> => {
    if (!name) {
      throw new Error("The `name` argument is required.");
    }
    const merged: SerializableSnapshotOptions = {
      root: pluginOptions.root,
      ...options,
    };
    // Same as screenshots: each browser of `browser.instances` writes to the
    // same `root`, and would overwrite the snapshots of the others.
    const browserSuffix = getBrowserSuffix(ctx.project.config.browser.name);
    return writeSnapshotFile(
      `${name}${browserSuffix}`,
      content,
      merged,
      test,
      captureIndex,
      storybook,
    );
  };
};
