/**
 * Merge the tags of a story given by several sources (the story, its
 * parameters…), deduplicated and without empty values.
 */
export function mergeTags(...tags: unknown[]): string[] {
  const merged = tags.flatMap((tag) =>
    Array.isArray(tag) ? tag : tag ? [tag] : [],
  );
  return Array.from(new Set(merged)).filter(
    (tag): tag is string => typeof tag === "string" && tag !== "",
  );
}

/**
 * Return whether a story has a play function.
 * Handles the `play` field of a composed story (itself a function) and the
 * `playFunction` field of a story context.
 */
export function hasPlay(story: unknown): boolean {
  if (!story || (typeof story !== "object" && typeof story !== "function")) {
    return false;
  }

  return (
    ("play" in story && typeof story.play === "function") ||
    ("playFunction" in story && typeof story.playFunction === "function")
  );
}
