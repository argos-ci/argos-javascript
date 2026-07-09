import type { BrowserCommand } from "vitest/node";
import type { ArgosAttachment } from "@argos-ci/playwright";
import type {
  ArgosVitestPluginOptions,
  SerializableSnapshotOptions,
} from "./options";
import { writeSnapshotFile } from "./snapshot-file";

/**
 * Arguments of the `argosSnapshot` browser command.
 * Only serializable values cross the browser/node RPC boundary — the value is
 * already serialized to a string on the browser side.
 */
export type ArgosSnapshotCommandArgs = [
  name: string,
  content: string,
  options?: SerializableSnapshotOptions,
];

/**
 * Create the `argosSnapshot` browser command used to write serialized snapshots
 * from Vitest browser tests. The serialized string is produced on the browser
 * side and this command writes it (and its metadata) to disk on the Node side.
 */
export const createArgosSnapshotCommand = (
  pluginOptions: ArgosVitestPluginOptions = {},
): BrowserCommand<ArgosSnapshotCommandArgs> => {
  return async (_ctx, name, content, options): Promise<ArgosAttachment[]> => {
    if (!name) {
      throw new Error("The `name` argument is required.");
    }
    const merged: SerializableSnapshotOptions = {
      root: pluginOptions.root,
      ...options,
    };
    return writeSnapshotFile(name, content, merged);
  };
};
