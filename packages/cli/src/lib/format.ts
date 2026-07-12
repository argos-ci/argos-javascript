import type { ArgosAPISchema } from "@argos-ci/api-client";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type SnapshotDiffStatus = SnapshotDiff["status"];
type TestMetrics = ArgosAPISchema.components["schemas"]["TestMetrics"];
type Change = ArgosAPISchema.components["schemas"]["Change"];
type BuildReview = ArgosAPISchema.components["schemas"]["BuildReview"];
type Comment = ArgosAPISchema.components["schemas"]["Comment"];
type User = ArgosAPISchema.components["schemas"]["User"];
type Project = ArgosAPISchema.components["schemas"]["Project"];
type AccountAnalytics =
  ArgosAPISchema.components["schemas"]["AccountAnalytics"];

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

/** Render a 0–1 metric to two decimals, or `-` when absent. */
function formatRatio(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : value.toFixed(2);
}

/** Compact one-line summary of a test's flakiness metrics. */
function formatFlakiness(metrics: TestMetrics): string {
  return `${formatRatio(metrics.flakiness)} (stability ${formatRatio(metrics.stability)}, consistency ${formatRatio(metrics.consistency)})`;
}

/** Human-readable lines for a single snapshot diff. */
function formatSnapshotDiff(diff: SnapshotDiff, build: Build): string[] {
  const lines = [
    `${diff.name} [${diff.status}]`,
    `  Review: ${build.url}/${diff.id}`,
    `  Mask: ${formatValue(diff.url)}`,
    `  Base file: ${formatValue(diff.base?.url)}`,
    `  Head file: ${formatValue(diff.head?.url)}`,
    `  Score: ${formatValue(diff.score)}`,
    `  Group: ${formatValue(diff.group)}`,
  ];
  if (diff.test) {
    lines.push(`  Flakiness: ${formatFlakiness(diff.test.metrics)}`);
  }
  if (diff.change) {
    const ignored = diff.change.ignored ? " [ignored]" : "";
    lines.push(
      `  Change: ${diff.change.id}${ignored} · ${diff.change.occurrences} occurrences`,
    );
  }
  return lines;
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
    ...diffs.flatMap((diff) => [...formatSnapshotDiff(diff, build), ""]),
  ]
    .slice(0, -1)
    .join("\n");
}

export function formatChange(change: Change): string {
  return [
    `Change ${change.id}`,
    `Ignored: ${change.ignored ? "yes" : "no"}`,
    `Occurrences: ${change.occurrences}`,
  ].join("\n");
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

export function formatAnalytics(
  analytics: AccountAnalytics,
  context: {
    account: string;
    from: string;
    to?: string | undefined;
    groupBy: string;
  },
): string {
  const { screenshots, builds } = analytics;
  const lines = [
    `Analytics for ${context.account}`,
    `Period: ${context.from} → ${context.to ?? "now"} (grouped by ${context.groupBy})`,
    "",
    `Builds: ${builds.all.total}`,
    `  Changes detected: ${builds.all.changesDetected}`,
    `  No changes: ${builds.all.noChanges}`,
    `  Accepted: ${builds.all.accepted}`,
    `  Rejected: ${builds.all.rejected}`,
    `Screenshots: ${screenshots.all.total}`,
  ];

  // Resolve project IDs (the keys of the `all.projects` count maps) to names.
  const names = new Map<string, string>();
  for (const project of [...builds.projects, ...screenshots.projects]) {
    names.set(project.id, project.name);
  }
  const ids = new Set([
    ...Object.keys(builds.all.projects),
    ...Object.keys(screenshots.all.projects),
  ]);
  if (ids.size > 0) {
    const rows = [...ids]
      .map((id) => ({
        name: names.get(id) ?? id,
        builds: builds.all.projects[id] ?? 0,
        screenshots: screenshots.all.projects[id] ?? 0,
      }))
      .sort((a, b) => b.builds - a.builds || b.screenshots - a.screenshots);
    lines.push("", `Projects (${rows.length}):`);
    for (const row of rows) {
      lines.push(
        `  ${row.name}: ${row.builds} builds, ${row.screenshots} screenshots`,
      );
    }
  }

  return lines.join("\n");
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
