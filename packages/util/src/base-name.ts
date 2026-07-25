/**
 * Normalize the user-facing `baseName` option — a single name or an ordered
 * list of candidates — into a list, or `null` when nothing was provided.
 */
export function normalizeBaseNames(
  baseName: string | string[] | undefined | null,
): string[] | null {
  if (!baseName) {
    return null;
  }
  const names = Array.isArray(baseName) ? baseName : [baseName];
  const validNames = names.filter((name) => name !== "");
  return validNames.length > 0 ? validNames : null;
}
