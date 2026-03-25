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
