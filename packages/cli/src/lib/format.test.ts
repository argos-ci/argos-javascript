import type { ArgosAPISchema } from "@argos-ci/api-client";
import { describe, expect, it } from "vitest";
import {
  formatBuild,
  formatComment,
  formatComments,
  formatProject,
  formatReview,
  formatReviews,
  formatSnapshotSummary,
  formatSnapshots,
  formatStats,
  formatValue,
} from "./format";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type SnapshotDiff = ArgosAPISchema.components["schemas"]["SnapshotDiff"];
type BuildReview = ArgosAPISchema.components["schemas"]["BuildReview"];
type Comment = ArgosAPISchema.components["schemas"]["Comment"];

const build = {
  number: 42,
  status: "changes-detected",
  conclusion: "changes-detected",
  stats: {
    total: 10,
    changed: 2,
    added: 1,
    removed: 0,
    unchanged: 7,
    ignored: 0,
    failure: 0,
    retryFailure: 0,
  },
  head: { sha: "abc123", branch: "feature" },
  base: { sha: "def456", branch: "main" },
  url: "https://app.argos-ci.com/o/p/builds/42",
} as unknown as Build;

describe("formatValue", () => {
  it("renders dashes for empty values", () => {
    expect(formatValue(null)).toBe("-");
    expect(formatValue(undefined)).toBe("-");
    expect(formatValue("")).toBe("-");
  });

  it("stringifies scalars", () => {
    expect(formatValue(0)).toBe("0");
    expect(formatValue("main")).toBe("main");
  });
});

describe("formatProject", () => {
  it("summarizes the created project", () => {
    const project = {
      id: "project-1",
      name: "my-app",
      account: { id: "account-1", slug: "acme" },
      defaultBaseBranch: "main",
      hasRemoteContentAccess: true,
    } as ArgosAPISchema.components["schemas"]["Project"];
    const output = formatProject(project);
    expect(output).toContain("Created project acme/my-app.");
    expect(output).toContain("ID: project-1");
    expect(output).toContain("Account: acme");
    expect(output).toContain("Default base branch: main");
  });
});

describe("formatStats", () => {
  it("renders a dash when stats are missing", () => {
    expect(formatStats(null)).toBe("-");
  });

  it("summarizes the diff counts", () => {
    expect(formatStats(build.stats)).toBe(
      "total 10, changed 2, added 1, removed 0, unchanged 7",
    );
  });
});

describe("formatSnapshotSummary", () => {
  it("counts diffs by status in a stable order", () => {
    const diffs = [
      { status: "added" },
      { status: "changed" },
      { status: "changed" },
    ] as SnapshotDiff[];
    expect(formatSnapshotSummary(diffs)).toBe("changed 2, added 1");
  });
});

describe("formatBuild", () => {
  it("includes the headline build fields", () => {
    const output = formatBuild(build);
    expect(output).toContain("Build #42");
    expect(output).toContain("Status: changes-detected");
    expect(output).toContain("Branch: feature");
    expect(output).toContain("Base branch: main");
    expect(output).toContain("URL: https://app.argos-ci.com/o/p/builds/42");
  });
});

describe("formatSnapshots", () => {
  it("reports an empty list", () => {
    expect(formatSnapshots([], build)).toBe("No snapshots found.");
  });

  it("lists each diff with a deep-link review URL", () => {
    const diffs = [
      {
        id: "diff-1",
        name: "home / desktop",
        status: "changed",
        score: 0.1,
        group: "home",
        url: "https://cdn/mask.png",
        base: { url: "https://cdn/base.png" },
        head: { url: "https://cdn/head.png" },
      },
    ] as unknown as SnapshotDiff[];
    const output = formatSnapshots(diffs, build);
    expect(output).toContain("Snapshots for build #42");
    expect(output).toContain("home / desktop [changed]");
    expect(output).toContain(
      "Review: https://app.argos-ci.com/o/p/builds/42/diff-1",
    );
  });
});

describe("formatReview / formatReviews", () => {
  const review = {
    id: "review-1",
    state: "approved",
    user: { id: "u1", slug: "alice", name: "Alice" },
    dismissedAt: null,
    dismissedBy: null,
    date: "2026-01-01T00:00:00.000Z",
  } as BuildReview;

  it("formats a single review", () => {
    const output = formatReview(review);
    expect(output).toContain("Review #review-1");
    expect(output).toContain("State: approved");
    expect(output).toContain("Author: Alice (@alice)");
  });

  it("surfaces dismissal info", () => {
    const dismissed = {
      ...review,
      dismissedAt: "2026-02-01T00:00:00.000Z",
      dismissedBy: { id: "u2", slug: "bob", name: null },
    } as BuildReview;
    expect(formatReview(dismissed)).toContain("Dismissed:");
    expect(formatReview(dismissed)).toContain("@bob");
  });

  it("reports an empty review list", () => {
    expect(formatReviews([])).toBe("No reviews found.");
  });

  it("lists reviews with their state", () => {
    expect(formatReviews([review])).toContain("#review-1 [approved]");
  });
});

describe("formatComment / formatComments", () => {
  const comment = {
    id: "c1",
    threadId: null,
    text: "Looks good",
    author: { id: "u1", slug: "alice", name: "Alice" },
    screenshotDiffId: null,
    anchor: null,
    pending: false,
    resolvedAt: null,
    editedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    reactions: [],
  } as unknown as Comment;

  it("formats a root comment", () => {
    const output = formatComment(comment);
    expect(output).toContain("Comment #c1");
    expect(output).toContain("Author: Alice (@alice)");
    expect(output).toContain("Looks good");
  });

  it("surfaces reply, anchor, draft, resolved and reactions", () => {
    const reply = {
      ...comment,
      threadId: "c0",
      screenshotDiffId: "diff-1",
      anchor: { type: "lines", from: 3, to: 9 },
      pending: true,
      resolvedAt: "2026-02-01T00:00:00.000Z",
      editedAt: "2026-01-02T00:00:00.000Z",
      reactions: [{ emoji: "👍", count: 2, users: [] }],
    } as unknown as Comment;
    const output = formatComment(reply);
    expect(output).toContain("Reply to: c0");
    expect(output).toContain("Diff: diff-1 (lines 3-9)");
    expect(output).toContain("Pending: draft");
    expect(output).toContain("Resolved:");
    expect(output).toContain("(edited)");
    expect(output).toContain("👍 2");
  });

  it("reports an empty comment list", () => {
    expect(formatComments([])).toBe("No comments found.");
  });

  it("tags threads and replies in a list", () => {
    const reply = {
      ...comment,
      id: "c2",
      threadId: "c1",
    } as unknown as Comment;
    const output = formatComments([comment, reply]);
    expect(output).toContain("#c1 [thread]");
    expect(output).toContain("#c2 [reply]");
  });
});
