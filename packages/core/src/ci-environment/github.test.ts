import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Context } from "./types";
import {
  getPullRequestFromHeadSha,
  getPullRequestFromPrNumber,
  getPRNumberFromMergeGroupBranch,
  type GitHubPullRequest,
} from "./github";

const mockPullRequest: GitHubPullRequest = {
  number: 123,
  head: {
    ref: "feature-branch",
    sha: "abc123def456",
  },
  base: {
    ref: "main",
  },
};

const server = setupServer(
  http.get("https://api.github.com/repos/:owner/:repo/pulls", () => {
    return HttpResponse.json([mockPullRequest]);
  }),
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:prNumber", () => {
    return HttpResponse.json(mockPullRequest);
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("getPullRequestFromHeadSha", () => {
  it("should find pull request by head sha", async () => {
    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    const result = await getPullRequestFromHeadSha(ctx, "abc123def456");
    expect(result).toEqual(mockPullRequest);
  });

  it("should return null when no pull request found", async () => {
    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    const result = await getPullRequestFromHeadSha(ctx, "nonexistent");
    expect(result).toBeNull();
  });

  it("should return null when no token available", async () => {
    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        DISABLE_GITHUB_TOKEN_WARNING: "true",
      },
    };

    const result = await getPullRequestFromHeadSha(ctx, "abc123def456");
    expect(result).toBeNull();
  });

  it("should throw on 500 response", async () => {
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/pulls", () => {
        return HttpResponse.json(null, { status: 500 });
      }),
    );

    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    await expect(
      getPullRequestFromHeadSha(ctx, "abc123def456"),
    ).rejects.toThrow(/Non-OK response/);
  });
});

describe("getPullRequestFromPrNumber", () => {
  it("should fetch pull request by number", async () => {
    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    const result = await getPullRequestFromPrNumber(ctx, 123);
    expect(result).toEqual(mockPullRequest);
  });

  it("should return null when no token available", async () => {
    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        DISABLE_GITHUB_TOKEN_WARNING: "true",
      },
    };

    const result = await getPullRequestFromPrNumber(ctx, 123);
    expect(result).toBeNull();
  });

  it("should return null on 404 response", async () => {
    server.use(
      http.get(
        "https://api.github.com/repos/:owner/:repo/pulls/:prNumber",
        () => {
          return HttpResponse.json(null, { status: 404 });
        },
      ),
    );

    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    const result = await getPullRequestFromPrNumber(ctx, 999);
    expect(result).toBeNull();
  });

  it("should throw on 500 response", async () => {
    server.use(
      http.get(
        "https://api.github.com/repos/:owner/:repo/pulls/:prNumber",
        () => {
          return HttpResponse.json(null, { status: 500 });
        },
      ),
    );

    const ctx: Context = {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
      },
    };

    await expect(getPullRequestFromPrNumber(ctx, 123)).rejects.toThrow(
      /Non-OK response/,
    );
  });
});

describe("getPRNumberFromMergeGroupBranch", () => {
  it("should extract PR number from merge group branch", () => {
    const branch =
      "gh-readonly-queue/merge-queue-argos/pr-1559-0bccfee0e5c6d7b3f72d0cab06cc79fc70666e08";
    const result = getPRNumberFromMergeGroupBranch(branch);
    expect(result).toBe(1559);
  });

  it("should return null for non-merge group branch", () => {
    const result = getPRNumberFromMergeGroupBranch("feature-branch");
    expect(result).toBeNull();
  });

  it("should return null for invalid merge group format", () => {
    const result = getPRNumberFromMergeGroupBranch(
      "gh-readonly-queue/master/invalid",
    );
    expect(result).toBeNull();
  });
});
