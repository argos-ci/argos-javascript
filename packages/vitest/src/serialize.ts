import { format, plugins } from "@vitest/pretty-format";
import type { VitestSnapshotOptions } from "./options";

/**
 * Plugins used to serialize snapshots. This mirrors the serializers Vitest
 * enables by default, so DOM nodes, React elements, errors, etc. are printed
 * the same way you would see them in a Vitest snapshot.
 */
const SNAPSHOT_PLUGINS = [
  plugins.DOMElement,
  plugins.DOMCollection,
  plugins.Immutable,
  plugins.ReactElement,
  plugins.ReactTestComponent,
  plugins.Error,
  plugins.AsymmetricMatcher,
];

/**
 * Serialize a snapshot value to the string that gets written to disk.
 *
 * - Strings are written verbatim (like Vitest's `toMatchFileSnapshot`).
 * - Everything else is serialized with `@vitest/pretty-format` (the same
 *   serializer Vitest uses for `toMatchSnapshot`), unless a custom `serialize`
 *   function is provided.
 *
 * This runs on the test side (browser or Node), so it can serialize values that
 * only exist there (e.g. DOM nodes) before the string crosses the RPC boundary.
 */
export function serializeSnapshot(
  content: unknown,
  options: Pick<VitestSnapshotOptions, "serialize"> = {},
): string {
  if (options.serialize) {
    return options.serialize(content);
  }
  if (typeof content === "string") {
    return content;
  }
  return format(content, { plugins: SNAPSHOT_PLUGINS });
}
