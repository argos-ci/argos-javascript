import mime from "mime-types";

/**
 * Get the mime type of a snapshot file based on its extension.
 */
export function getSnapshotMimeType(filepath: string): string {
  const type = mime.lookup(filepath);
  if (!type) {
    throw new Error(`Unable to determine snapshot file type for: ${filepath}`);
  }
  return type;
}
