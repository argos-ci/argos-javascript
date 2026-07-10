import type { ArgosAPISchema } from "@argos-ci/api-client";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type SnapshotDiffStatus = SnapshotDiff["status"];
type BuildReview = ArgosAPISchema.components["schemas"]["BuildReview"];
type Comment = ArgosAPISchema.components["schemas"]["Comment"];
type User = ArgosAPISchema.components["schemas"]["User"];
type Project = ArgosAPISchema.components["schemas"]["Project"];

/** Render a scalar, using `-` for empty values. */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatUser(user: User | null | undefined): string {
  if (!user) {
    return "-";
  }
  return user.name ? `${user.name} (@${user.slug})` : `@${user.slug}`;
}

export function formatMe(user: User): string {
  return [
    `Logged in to Argos as ${formatUser(user)}.`,
    `Slug: ${user.slug}`,
    `Name: ${formatValue(user.name)}`,
  ].join("\n");
}

export function formatProject(project: Project): string {
  return [
    `Created project ${project.account.slug}/${project.name}.`,
    `ID: ${project.id}`,
    `Name: ${project.name}`,
    `Account: ${project.account.slug}`,
    `Default base branch: ${formatValue(project.defaultBaseBranch)}`,
  ].join("\n");
}

export function formatStats(stats: Build["stats"]): string {
  if (!stats) {
    return "-";
  }
  return [
    `total ${stats.total}`,
    `changed ${stats.changed}`,
    `added ${stats.added}`,
    `removed ${stats.removed}`,
    `unchanged ${stats.unchanged}`,
  ].join(", ");
}

const SNAPSHOT_STATUS_ORDER: SnapshotDiffStatus[] = [
  "changed",
  "added",
  "removed",
  "unchanged",
  "ignored",
  "pending",
  "failure",
  "retryFailure",
];

export function formatSnapshotSummary(diffs: SnapshotDiff[]): string {
  const counts = new Map<SnapshotDiffStatus, number>();
  for (const diff of diffs) {
    counts.set(diff.status, (counts.get(diff.status) ?? 0) + 1);
  }
  return SNAPSHOT_STATUS_ORDER.map((status) => {
    const count = counts.get(status);
    return count ? `${status} ${count}` : null;
  })
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

export function formatBuild(build: Build): string {
  return [
    `Build #${build.number}`,
    `Status: ${build.status}`,
    `Snapshots: ${formatStats(build.stats)}`,
    `Conclusion: ${formatValue(build.conclusion)}`,
    `Branch: ${formatValue(build.head?.branch)}`,
    `Commit: ${formatValue(build.head?.sha)}`,
    `Base branch: ${formatValue(build.base?.branch)}`,
    `Base commit: ${formatValue(build.base?.sha)}`,
    `URL: ${build.url}`,
  ].join("\n");
}

export function formatSnapshots(diffs: SnapshotDiff[], build: Build): string {
  if (diffs.length === 0) {
    return "No snapshots found.";
  }
  return [
    `Snapshots for build #${build.number}`,
    `Count: ${diffs.length}`,
    `Summary: ${formatSnapshotSummary(diffs)}`,
    "",
    ...diffs.flatMap((diff) => [
      `${diff.name} [${diff.status}]`,
      `  Review: ${build.url}/${diff.id}`,
      `  Mask: ${formatValue(diff.url)}`,
      `  Base file: ${formatValue(diff.base?.url)}`,
      `  Head file: ${formatValue(diff.head?.url)}`,
      `  Score: ${formatValue(diff.score)}`,
      `  Group: ${formatValue(diff.group)}`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}

export function formatReview(review: BuildReview): string {
  const lines = [
    `Review #${review.id}`,
    `State: ${review.state}`,
    `Author: ${formatUser(review.user)}`,
    `Date: ${review.date}`,
  ];
  if (review.dismissedAt) {
    lines.push(
      `Dismissed: ${review.dismissedAt} by ${formatUser(review.dismissedBy)}`,
    );
  }
  return lines.join("\n");
}

export function formatReviews(reviews: BuildReview[]): string {
  if (reviews.length === 0) {
    return "No reviews found.";
  }
  return [
    `Reviews (${reviews.length})`,
    "",
    ...reviews.flatMap((review) => [
      `#${review.id} [${review.state}${review.dismissedAt ? ", dismissed" : ""}]`,
      `  Author: ${formatUser(review.user)}`,
      `  Date: ${review.date}`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function formatAnchor(anchor: Comment["anchor"]): string | null {
  if (!anchor) {
    return null;
  }
  return anchor.type === "point"
    ? `point ${anchor.x},${anchor.y}`
    : `lines ${anchor.from}-${anchor.to}`;
}

function formatReactions(reactions: Comment["reactions"]): string | null {
  if (reactions.length === 0) {
    return null;
  }
  return reactions.map((r) => `${r.emoji} ${r.count}`).join(" ");
}

export function formatComment(comment: Comment): string {
  const lines = [
    `Comment #${comment.id}`,
    `Author: ${formatUser(comment.author)}`,
  ];
  if (comment.threadId) {
    lines.push(`Reply to: ${comment.threadId}`);
  }
  if (comment.screenshotDiffId) {
    const anchor = formatAnchor(comment.anchor);
    lines.push(
      `Diff: ${comment.screenshotDiffId}${anchor ? ` (${anchor})` : ""}`,
    );
  }
  if (comment.pending) {
    lines.push("Pending: draft (only visible to you)");
  }
  if (comment.resolvedAt) {
    lines.push(`Resolved: ${comment.resolvedAt}`);
  }
  const reactions = formatReactions(comment.reactions);
  if (reactions) {
    lines.push(`Reactions: ${reactions}`);
  }
  lines.push(
    `Date: ${comment.createdAt}${comment.editedAt ? " (edited)" : ""}`,
  );
  lines.push("", indent(comment.text));
  return lines.join("\n");
}

export function formatComments(comments: Comment[]): string {
  if (comments.length === 0) {
    return "No comments found.";
  }
  return [
    `Comments (${comments.length})`,
    "",
    ...comments.flatMap((comment) => {
      const tags = [
        comment.threadId ? "reply" : "thread",
        comment.pending ? "draft" : null,
        comment.resolvedAt ? "resolved" : null,
      ].filter(Boolean);
      return [
        `#${comment.id} [${tags.join(", ")}] ${formatUser(comment.author)}`,
        indent(comment.text),
        "",
      ];
    }),
  ]
    .slice(0, -1)
    .join("\n");
}
