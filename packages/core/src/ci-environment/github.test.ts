import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Context } from "./types";
import {
  getMergeBaseCommitShaFromAPI,
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

describe("getMergeBaseCommitShaFromAPI", () => {
  /** URLs the compare handler was asked for, newest last. */
  let requested: string[];

  function createContext(env: Record<string, string> = {}): Context {
    return {
      env: {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "token123",
        ...env,
      },
    };
  }

  beforeEach(() => {
    requested = [];
    for (const origin of [
      "https://api.github.com",
      "https://github.acme.com/api/v3",
    ]) {
      server.use(
        http.get(`${origin}/repos/:owner/:repo/compare/*`, ({ request }) => {
          requested.push(request.url);
          if (request.url.includes("unknown-ref")) {
            return new HttpResponse(null, { status: 404 });
          }
          return HttpResponse.json({
            merge_base_commit: { sha: "base-branch-tip" },
          });
        }),
      );
    }
  });

  it("returns the merge base GitHub computed", async () => {
    const result = await getMergeBaseCommitShaFromAPI(createContext(), {
      base: "main",
      head: "head-sha",
    });

    expect(result).toBe("base-branch-tip");
    expect(requested[0]).toBe(
      "https://api.github.com/repos/owner/repo/compare/main...head-sha",
    );
  });

  it("keeps slashes in a ref as path separators and encodes the rest", async () => {
    await getMergeBaseCommitShaFromAPI(createContext(), {
      base: "release/2.0 rc",
      head: "head-sha",
    });

    expect(requested[0]).toContain("/compare/release/2.0%20rc...head-sha");
  });

  it("uses GITHUB_API_URL so it works on GitHub Enterprise", async () => {
    const result = await getMergeBaseCommitShaFromAPI(
      createContext({ GITHUB_API_URL: "https://github.acme.com/api/v3" }),
      { base: "main", head: "head-sha" },
    );

    expect(result).toBe("base-branch-tip");
    expect(requested[0]).toBe(
      "https://github.acme.com/api/v3/repos/owner/repo/compare/main...head-sha",
    );
  });

  it("returns null without a token, and says nothing about it", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const result = await getMergeBaseCommitShaFromAPI(
        { env: { GITHUB_REPOSITORY: "owner/repo" } },
        { base: "main", head: "head-sha" },
      );

      expect(result).toBeNull();
      expect(requested).toEqual([]);
      // git answers this next, so a build that works must not be told off.
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("returns null without a repository", async () => {
    const result = await getMergeBaseCommitShaFromAPI(
      { env: { GITHUB_TOKEN: "token123" } },
      { base: "main", head: "head-sha" },
    );

    expect(result).toBeNull();
    expect(requested).toEqual([]);
  });

  it("returns null on a non-OK response rather than failing the build", async () => {
    const result = await getMergeBaseCommitShaFromAPI(createContext(), {
      base: "unknown-ref",
      head: "head-sha",
    });

    expect(result).toBeNull();
  });

  it("returns null when the API cannot be reached", async () => {
    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/compare/*", () =>
        HttpResponse.error(),
      ),
    );

    const result = await getMergeBaseCommitShaFromAPI(createContext(), {
      base: "main",
      head: "head-sha",
    });

    expect(result).toBeNull();
  });
});
