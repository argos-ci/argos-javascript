import type { ScreenshotMetadata } from "@argos-ci/util";

type StoryTag = string | string[] | undefined;

function toArray(v?: StoryTag): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

export function mergeTags(...tags: StoryTag[]): string[] {
  const merged = tags.flatMap((tags) => toArray(tags));
  return Array.from(new Set(merged)).filter(
    (tag): tag is string => typeof tag === "string" && tag !== "",
  );
}

/**
 * Return whether a story context has a play function.
 * Handles both the `play` field (plain story function) and the legacy
 * `playFunction` field present in older Storybook test-runner contexts.
 */
export function hasPlay(storyContext: unknown): boolean {
  if (!storyContext || typeof storyContext !== "object") {
    return false;
  }

  return (
    ("play" in storyContext && typeof storyContext.play === "function") ||
    ("playFunction" in storyContext &&
      typeof storyContext.playFunction === "function")
  );
}

/**
 * Build the story metadata object that is attached to a screenshot.
 *
 * @param story - The story shape (id, tags, play flag).
 * @param storyMode - The Storybook mode name (e.g. "dark", "mobile") as defined in `parameters.argos.modes`
 */
export function getStoryMetadata(
  story: {
    id: string;
    tags?: string[];
    play?: boolean;
  },
  storyMode?: string | null,
): ScreenshotMetadata["story"] {
  return {
    id: story.id,
    tags: story.tags ?? [],
    mode: storyMode ?? undefined,
    play: Boolean(story.play),
  };
}
