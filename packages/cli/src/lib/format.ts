import type { ArgosAPISchema } from "@argos-ci/api-client";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type SnapshotDiffStatus = SnapshotDiff["status"];
type TestMetrics = ArgosAPISchema.components["schemas"]["TestMetrics"];
type TestDetails = ArgosAPISchema.components["schemas"]["TestDetails"];
type TestChange = ArgosAPISchema.components["schemas"]["TestChange"];
type TestChangeOccurrence =
  ArgosAPISchema.components["schemas"]["TestChangeOccurrence"];
type Change = ArgosAPISchema.components["schemas"]["Change"];
type BuildReview = ArgosAPISchema.components["schemas"]["BuildReview"];
type Comment = ArgosAPISchema.components["schemas"]["Comment"];
type User = ArgosAPISchema.components["schemas"]["User"];
type Project = ArgosAPISchema.components["schemas"]["Project"];
type AccountAnalytics =
  ArgosAPISchema.components["schemas"]["AccountAnalytics"];
type AccountDetails = ArgosAPISchema.components["schemas"]["AccountDetails"];
type TeamMember = ArgosAPISchema.components["schemas"]["TeamMember"];
type TeamInvite = ArgosAPISchema.components["schemas"]["TeamInvite"];
type TeamDomain = ArgosAPISchema.components["schemas"]["TeamDomain"];
type InviteLink = ArgosAPISchema.components["schemas"]["InviteLink"];
type ProjectContributor =
  ArgosAPISchema.components["schemas"]["ProjectContributor"];
type ProjectDomain = ArgosAPISchema.components["schemas"]["ProjectDomain"];
type IgnoredChange = ArgosAPISchema.components["schemas"]["IgnoredChange"];
type TestSummary = ArgosAPISchema.components["schemas"]["TestSummary"];
type BuildReviewers = ArgosAPISchema.components["schemas"]["BuildReviewers"];
type NotificationSubscription =
  ArgosAPISchema.components["schemas"]["NotificationSubscription"];
type AutomationRule = ArgosAPISchema.components["schemas"]["AutomationRule"];
/** A deployment as returned by `listProjectDeployments`; it has no named schema. */
export type ProjectDeployment =
  ArgosAPISchema.operations["listProjectDeployments"]["responses"][200]["content"]["application/json"]["results"][number];

/** Render a scalar, using `-` for empty values. */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

/** Render a flag as `yes` / `no`. */
function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
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

export function formatCreatedProject(project: Project): string {
  return [
    `Created project ${project.account.slug}/${project.name}.`,
    `ID: ${project.id}`,
    `Name: ${project.name}`,
    `Account: ${project.account.slug}`,
    `Default base branch: ${formatValue(project.defaultBaseBranch)}`,
  ].join("\n");
}

export function formatProject(project: Project): string {
  return [
    `Project ${project.account.slug}/${project.name}`,
    `ID: ${project.id}`,
    `Visibility: ${project.private ? "private" : "public"}`,
    `Default base branch: ${formatValue(project.defaultBaseBranch)}`,
    `Auto-approved branches: ${formatValue(project.autoApprovedBranchGlob)}`,
    `Summary check: ${project.summaryCheck}`,
    `PR comment: ${formatBoolean(project.prCommentEnabled)}`,
    `Default user level: ${formatValue(project.defaultUserLevel)}`,
    `Ignore changes: ${formatIgnoreConfig(project.ignoreConfig)}`,
    `Deployments: ${formatBoolean(project.deploymentEnabled)} (${project.deploymentAuth}, production branches ${formatValue(project.deploymentProductionBranchGlob)})`,
    `GitHub Actions OIDC: ${formatBoolean(project.githubActionsOidcEnabled)}`,
    `Tokenless auth: ${formatBoolean(project.tokenlessAuthEnabled)}`,
  ].join("\n");
}

function formatIgnoreConfig(config: Project["ignoreConfig"]): string {
  if (!config.enabled) {
    return "disabled";
  }
  const autoIgnore = config.autoIgnore;
  return autoIgnore
    ? `enabled, auto-ignore after ${autoIgnore.changes} occurrences`
    : "enabled, auto-ignore off";
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

/** When and where a change was captured, on one line. */
function formatOccurrence(occurrence: TestChangeOccurrence): string {
  return `${occurrence.date} in build #${occurrence.buildNumber}`;
}

export function formatTest(test: TestDetails): string {
  const lines = [
    `Test ${test.id} [${test.status}]`,
    `Name: ${test.name}`,
    `Build name: ${test.buildName}`,
    `Flakiness: ${formatFlakiness(test.metrics)}`,
    `Builds: ${test.metrics.total}`,
    `Changes: ${test.metrics.changes} (${test.metrics.uniqueChanges} seen only once)`,
  ];
  if (test.firstSeenChange) {
    lines.push(`First change: ${formatOccurrence(test.firstSeenChange)}`);
  }
  if (test.lastSeenChange) {
    lines.push(`Last change: ${formatOccurrence(test.lastSeenChange)}`);
  }
  lines.push(`URL: ${test.url}`);
  return lines.join("\n");
}

export function formatTestChanges(changes: TestChange[]): string {
  if (changes.length === 0) {
    return "No changes found.";
  }
  return [
    `Changes (${changes.length})`,
    "",
    ...changes.flatMap((change) => [
      `${change.id}${change.ignored ? " [ignored]" : ""}`,
      `  Occurrences: ${change.occurrences}`,
      `  First seen: ${formatOccurrence(change.firstSeen)}`,
      `  Last seen: ${formatOccurrence(change.lastSeen)}`,
      `  Mask: ${formatValue(change.diff.url)}`,
      `  Base file: ${formatValue(change.diff.base?.url)}`,
      `  Head file: ${formatValue(change.diff.head?.url)}`,
      "",
    ]),
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

export function formatAccount(account: AccountDetails): string {
  const lines = [
    `Account ${account.slug} (${account.type})`,
    `ID: ${account.id}`,
    `Name: ${formatValue(account.name)}`,
    `Plan: ${formatValue(account.plan?.name)}`,
    `Period: ${formatValue(account.periodStartDate)} → ${formatValue(account.periodEndDate)}`,
    `Screenshots: ${account.currentPeriodScreenshots} / ${account.includedScreenshots} (${Math.round(account.consumptionRatio * 100)}%)`,
  ];
  if (account.additionalScreenshotsCost > 0) {
    lines.push(
      `Additional screenshots cost: ${account.additionalScreenshotsCost}`,
    );
  }
  if (account.defaultUserLevel) {
    lines.push(`Default user level: ${account.defaultUserLevel}`);
  }
  return lines.join("\n");
}

export function formatMembers(members: TeamMember[]): string {
  if (members.length === 0) {
    return "No members found.";
  }
  return [
    `Members (${members.length})`,
    "",
    ...members.map(
      (member) =>
        `${formatUser(member.user)} [${member.level}] · user ${member.user.id}`,
    ),
  ].join("\n");
}

export function formatMember(member: TeamMember): string {
  return [
    `Member ${formatUser(member.user)}`,
    `Level: ${member.level}`,
    `User ID: ${member.user.id}`,
  ].join("\n");
}

export function formatInvites(invites: TeamInvite[]): string {
  if (invites.length === 0) {
    return "No pending invites found.";
  }
  return [
    `Invites (${invites.length})`,
    "",
    ...invites.map(
      (invite) =>
        `${invite.email} [${invite.level}${invite.expired ? ", expired" : ""}] · ${invite.id} · expires ${invite.expiresAt}`,
    ),
  ].join("\n");
}

export function formatInviteLink(link: InviteLink): string {
  return `Invite link: ${link.inviteLink}`;
}

export function formatDomains(domains: TeamDomain[]): string {
  if (domains.length === 0) {
    return "No email domains found.";
  }
  return [
    `Email domains (${domains.length})`,
    "",
    ...domains.map((domain) => `${domain.domain} · added ${domain.createdAt}`),
  ].join("\n");
}

export function formatDomain(domain: TeamDomain): string {
  return [`Domain ${domain.domain}`, `Added: ${domain.createdAt}`].join("\n");
}

export function formatContributors(contributors: ProjectContributor[]): string {
  if (contributors.length === 0) {
    return "No contributors found.";
  }
  return [
    `Contributors (${contributors.length})`,
    "",
    ...contributors.map(
      (contributor) =>
        `${formatUser(contributor.user)} [${contributor.level}] · user ${contributor.user.id}`,
    ),
  ].join("\n");
}

export function formatContributor(contributor: ProjectContributor): string {
  return [
    `Contributor ${formatUser(contributor.user)}`,
    `Level: ${contributor.level}`,
    `User ID: ${contributor.user.id}`,
  ].join("\n");
}

export function formatDeployments(deployments: ProjectDeployment[]): string {
  if (deployments.length === 0) {
    return "No deployments found.";
  }
  return [
    `Deployments (${deployments.length})`,
    "",
    ...deployments.flatMap((deployment) => [
      `${deployment.id} [${deployment.status}, ${deployment.environment}]`,
      `  Branch: ${formatValue(deployment.branch)}`,
      `  Commit: ${formatValue(deployment.commitSha)}`,
      `  Date: ${deployment.createdAt}`,
      `  URL: ${deployment.url}`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}

export function formatProjectDomain(domain: ProjectDomain): string {
  return `Deployment domain: ${formatValue(domain.domain)}`;
}

export function formatIgnoredChanges(changes: IgnoredChange[]): string {
  if (changes.length === 0) {
    return "No ignored changes found.";
  }
  return [
    `Ignored changes (${changes.length})`,
    "",
    ...changes.flatMap((change) => [
      change.id,
      `  Test: ${change.test.name} (${change.test.buildName})`,
      `  Test ID: ${change.test.id}`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}

export function formatTests(tests: TestSummary[]): string {
  if (tests.length === 0) {
    return "No tests found.";
  }
  return [
    `Tests (${tests.length})`,
    "",
    ...tests.flatMap((test) => [
      `${test.name} (${test.buildName})`,
      `  ID: ${test.id}`,
      `  Flakiness: ${formatFlakiness(test.metrics)}`,
      `  Changes: ${test.metrics.changes} over ${test.metrics.total} builds`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}

export function formatReviewers(data: BuildReviewers): string {
  if (data.reviewers.length === 0) {
    return "No reviewers requested.";
  }
  return [
    `Requested reviewers (${data.reviewers.length})`,
    "",
    ...data.reviewers.map((user) => `${formatUser(user)} · user ${user.id}`),
  ].join("\n");
}

export function formatSubscription(
  subscription: NotificationSubscription,
): string {
  return subscription.subscribed
    ? "Subscribed: you will receive notifications."
    : "Unsubscribed: you will no longer receive notifications.";
}

/** One line per condition, rendering the `not` and `glob` wrappers inline. */
function formatConditions(conditions: AutomationRule["conditions"]): string[] {
  return conditions.map((condition) => {
    if ("not" in condition) {
      const inner = condition.not;
      return "glob" in inner
        ? `not ${inner.glob.type} matches ${inner.glob.value}`
        : `not ${inner.type} is ${formatValue(inner.value)}`;
    }
    if ("glob" in condition) {
      return `${condition.glob.type} matches ${condition.glob.value}`;
    }
    return `${condition.type} is ${formatValue(condition.value)}`;
  });
}

export function formatAutomationRule(rule: AutomationRule): string {
  const lines = [
    `Rule ${rule.name} [${rule.active ? "active" : "inactive"}]`,
    `ID: ${rule.id}`,
    `Events: ${rule.events.join(", ")}`,
  ];
  const conditions = formatConditions(rule.conditions);
  lines.push(
    conditions.length > 0
      ? `Conditions: ${conditions.join(" AND ")}`
      : "Conditions: none",
  );
  lines.push(
    `Actions: ${rule.actions.map((action) => action.action).join(", ")}`,
  );
  lines.push(`Updated: ${rule.updatedAt}`);
  return lines.join("\n");
}

export function formatAutomationRules(rules: AutomationRule[]): string {
  if (rules.length === 0) {
    return "No automation rules found.";
  }
  return [
    `Automation rules (${rules.length})`,
    "",
    ...rules.flatMap((rule) => [
      `${rule.name} [${rule.active ? "active" : "inactive"}]`,
      `  ID: ${rule.id}`,
      `  Events: ${rule.events.join(", ")}`,
      `  Actions: ${rule.actions.map((action) => action.action).join(", ")}`,
      "",
    ]),
  ]
    .slice(0, -1)
    .join("\n");
}
