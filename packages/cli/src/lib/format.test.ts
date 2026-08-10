import type { ArgosAPISchema } from "@argos-ci/api-client";
import { describe, expect, it } from "vitest";
import {
  formatBuild,
  formatChange,
  formatComment,
  formatComments,
  formatCreatedProject,
  formatMedia,
  formatMediaList,
  formatMediaVersions,
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
type Media = ArgosAPISchema.components["schemas"]["Media"];
type MediaVersion = ArgosAPISchema.components["schemas"]["MediaVersion"];

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

describe("formatCreatedProject", () => {
  it("summarizes the created project", () => {
    const project = {
      id: "project-1",
      name: "my-app",
      account: { id: "account-1", slug: "acme" },
      defaultBaseBranch: "main",
      hasRemoteContentAccess: true,
    } as ArgosAPISchema.components["schemas"]["Project"];
    const output = formatCreatedProject(project);
    expect(output).toContain("Created project acme/my-app.");
    expect(output).toContain("ID: project-1");
    expect(output).toContain("Account: acme");
    expect(output).toContain("Default base branch: main");
  });
});

describe("formatProject", () => {
  it("summarizes the project settings", () => {
    const project = {
      id: "project-1",
      name: "my-app",
      account: { id: "account-1", slug: "acme" },
      defaultBaseBranch: "main",
      hasRemoteContentAccess: true,
      autoApprovedBranchGlob: "main",
      deploymentProductionBranchGlob: "main",
      private: true,
      summaryCheck: "auto",
      prCommentEnabled: true,
      githubActionsOidcEnabled: false,
      tokenlessAuthEnabled: false,
      deploymentEnabled: true,
      deploymentAuth: "public",
      defaultUserLevel: "reviewer",
      ignoreConfig: { enabled: true, autoIgnore: { changes: 3 } },
    } as ArgosAPISchema.components["schemas"]["Project"];
    const output = formatProject(project);
    expect(output).toContain("Project acme/my-app");
    expect(output).toContain("Visibility: private");
    expect(output).toContain("Summary check: auto");
    expect(output).toContain(
      "Ignore changes: enabled, auto-ignore after 3 occurrences",
    );
    expect(output).toContain(
      "Deployments: yes (public, production branches main)",
    );
  });

  it("reports a disabled ignore config", () => {
    const project = {
      id: "project-1",
      name: "my-app",
      account: { id: "account-1", slug: "acme" },
      defaultBaseBranch: "main",
      autoApprovedBranchGlob: "main",
      deploymentProductionBranchGlob: "main",
      private: false,
      summaryCheck: "never",
      prCommentEnabled: false,
      githubActionsOidcEnabled: false,
      tokenlessAuthEnabled: false,
      deploymentEnabled: false,
      deploymentAuth: "private",
      defaultUserLevel: null,
      ignoreConfig: { enabled: false, autoIgnore: null },
    } as unknown as ArgosAPISchema.components["schemas"]["Project"];
    const output = formatProject(project);
    expect(output).toContain("Visibility: public");
    expect(output).toContain("Ignore changes: disabled");
    expect(output).toContain("Default user level: -");
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

  it("surfaces flakiness metrics and the change id", () => {
    const diffs = [
      {
        id: "diff-1",
        name: "home / desktop",
        status: "changed",
        score: 0.1,
        group: null,
        url: null,
        base: null,
        head: null,
        test: {
          id: "P-abc",
          name: "home",
          buildName: "default",
          metrics: {
            total: 20,
            changes: 5,
            uniqueChanges: 4,
            stability: 0.75,
            consistency: 0.2,
            flakiness: 0.6,
          },
        },
        change: { id: "P-abc-xyz", ignored: true, occurrences: 12 },
      },
    ] as unknown as SnapshotDiff[];
    const output = formatSnapshots(diffs, build);
    expect(output).toContain(
      "Flakiness: 0.60 (stability 0.75, consistency 0.20)",
    );
    expect(output).toContain("Change: P-abc-xyz [ignored] · 12 occurrences");
  });

  it("omits flakiness and change lines when absent", () => {
    const diffs = [
      {
        id: "diff-1",
        name: "home / desktop",
        status: "unchanged",
        score: null,
        group: null,
        url: null,
        base: null,
        head: null,
        test: null,
        change: null,
      },
    ] as unknown as SnapshotDiff[];
    const output = formatSnapshots(diffs, build);
    expect(output).not.toContain("Flakiness:");
    expect(output).not.toContain("Change:");
  });
});

describe("formatChange", () => {
  it("summarizes an ignored change", () => {
    const output = formatChange({
      id: "P-abc-xyz",
      ignored: true,
      occurrences: 7,
    });
    expect(output).toContain("Change P-abc-xyz");
    expect(output).toContain("Ignored: yes");
    expect(output).toContain("Occurrences: 7");
  });

  it("reports an unignored change", () => {
    expect(
      formatChange({ id: "P-abc-xyz", ignored: false, occurrences: 0 }),
    ).toContain("Ignored: no");
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

  it("shows where on a media a comment points, and which upload it points at", () => {
    // A media comment has an anchor and no diff behind it, so the pin has to be
    // reported on its own — otherwise the coordinates never reach the reader.
    const pinned = {
      ...comment,
      mediaId: "42",
      mediaVersionId: "media-version-9",
      anchor: { type: "point", x: 0.62, y: 0.34 },
    } as unknown as Comment;
    const output = formatComment(pinned);
    expect(output).toContain("Pinned: point 0.62,0.34");
    expect(output).toContain("Media version: media-version-9");
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

describe("formatMedia / formatMediaList", () => {
  const media = {
    id: "42",
    name: "checkout.png",
    state: "after",
    description: null,
    stage: "staged",
    branch: "feat/checkout",
    prNumber: null,
    url: "https://app.argos-ci.com/m/tok",
    markdown: "![checkout.png](https://app.argos-ci.com/m/tok)",
    version: 1,
    versionCount: 1,
    fileUrl: "https://files.argos-ci.com/media/1/abc.webp",
    posterUrl: null,
    contentType: "image/webp",
    sizeBytes: 188_416,
    width: 1440,
    height: 900,
    visibility: "public",
    status: "ready",
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  } as unknown as Media;

  it("reports an empty list", () => {
    expect(formatMediaList([])).toBe("No media found.");
  });

  it("labels which half of a pair the media is", () => {
    expect(formatMedia(media)).toContain("checkout.png (after)");
  });

  it("says a staged media is waiting on a pull request for its branch", () => {
    expect(formatMedia(media)).toContain("staged on feat/checkout");
  });

  it("names the pull request a published media went to", () => {
    const published = {
      ...media,
      stage: "published",
      prNumber: 1234,
    } as unknown as Media;
    expect(formatMedia(published)).toContain("published to PR #1234");
  });

  it("prints the details, the file and the embed to paste", () => {
    const output = formatMedia(media);
    expect(output).toContain("image/webp · 184 KB · 1440x900 · public · ready");
    // The file URL is what lets an agent go and look at the image itself.
    expect(output).toContain(
      "File: https://files.argos-ci.com/media/1/abc.webp",
    );
    expect(output).toContain(
      "Markdown: ![checkout.png](https://app.argos-ci.com/m/tok)",
    );
  });

  it("only mentions the version once there is history", () => {
    expect(formatMedia(media)).not.toContain("Version:");
    const revised = {
      ...media,
      version: 2,
      versionCount: 3,
    } as unknown as Media;
    expect(formatMedia(revised)).toContain("Version: 2 of 3");
  });
});

describe("formatMediaVersions", () => {
  const version = {
    id: "media-version-9",
    number: 2,
    fileUrl: "https://files.argos-ci.com/media/1/def.webp",
    posterUrl: null,
    contentType: "image/webp",
    sizeBytes: 2048,
    width: 1440,
    height: 900,
    expiresAt: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  } as unknown as MediaVersion;

  it("reports an empty history", () => {
    expect(formatMediaVersions([])).toBe("No versions found.");
  });

  it("prints the id a comment points at, and the file to look at", () => {
    const output = formatMediaVersions([version]);
    expect(output).toContain("#2 · image/webp · 2 KB · 1440x900");
    expect(output).toContain("ID: media-version-9");
    expect(output).toContain(
      "File: https://files.argos-ci.com/media/1/def.webp",
    );
  });
});
