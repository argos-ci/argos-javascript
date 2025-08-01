import { describe, it, expect } from "vitest";
import { getRepositoryNameFromURL } from "./url";

describe("getRepositoryNameFromURL", () => {
  it("parses valid SSH URLs with .git extension", () => {
    expect(getRepositoryNameFromURL("git@github.com:owner/repo.git")).toBe(
      "owner/repo",
    );
    expect(
      getRepositoryNameFromURL("git@gitlab.com:username/project.git"),
    ).toBe("username/project");
    expect(
      getRepositoryNameFromURL("git@bitbucket.org:team/repository.git"),
    ).toBe("team/repository");
  });

  it("parses valid SSH URLs without .git extension", () => {
    expect(getRepositoryNameFromURL("git@github.com:owner/repo")).toBe(
      "owner/repo",
    );
    expect(getRepositoryNameFromURL("git@gitlab.com:username/project")).toBe(
      "username/project",
    );
    expect(getRepositoryNameFromURL("git@bitbucket.org:team/repository")).toBe(
      "team/repository",
    );
  });

  it("parses valid HTTPS URLs with .git extension", () => {
    expect(getRepositoryNameFromURL("https://github.com/owner/repo.git")).toBe(
      "owner/repo",
    );
    expect(
      getRepositoryNameFromURL("https://gitlab.com/username/project.git"),
    ).toBe("username/project");
    expect(
      getRepositoryNameFromURL("https://bitbucket.org/team/repository.git"),
    ).toBe("team/repository");
  });

  it("parses valid HTTPS URLs without .git extension", () => {
    expect(getRepositoryNameFromURL("https://github.com/owner/repo")).toBe(
      "owner/repo",
    );
    expect(
      getRepositoryNameFromURL("https://gitlab.com/username/project"),
    ).toBe("username/project");
    expect(
      getRepositoryNameFromURL("https://bitbucket.org/team/repository"),
    ).toBe("team/repository");
  });

  it("parses valid HTTP URLs", () => {
    expect(getRepositoryNameFromURL("http://github.com/owner/repo.git")).toBe(
      "owner/repo",
    );
    expect(getRepositoryNameFromURL("http://gitlab.com/username/project")).toBe(
      "username/project",
    );
  });

  it("parses valid git protocol URLs", () => {
    expect(getRepositoryNameFromURL("git://github.com/owner/repo.git")).toBe(
      "owner/repo",
    );
    expect(getRepositoryNameFromURL("git://gitlab.com/username/project")).toBe(
      "username/project",
    );
  });

  it("handles repository names with hyphens and underscores", () => {
    expect(getRepositoryNameFromURL("git@github.com:my-org/my-repo.git")).toBe(
      "my-org/my-repo",
    );
    expect(getRepositoryNameFromURL("git@github.com:my_org/my_repo")).toBe(
      "my_org/my_repo",
    );
    expect(
      getRepositoryNameFromURL("git@github.com:org-name/repo_name-test.git"),
    ).toBe("org-name/repo_name-test");
    expect(
      getRepositoryNameFromURL(
        "https://github.com/org-name/repo_name-test.git",
      ),
    ).toBe("org-name/repo_name-test");
  });

  it("returns null for invalid URLs", () => {
    expect(getRepositoryNameFromURL("")).toBe(null);
    expect(getRepositoryNameFromURL("git@github.com")).toBe(null);
    expect(getRepositoryNameFromURL("git@github.com:")).toBe(null);
    expect(getRepositoryNameFromURL("git@github.com:owner")).toBe(null);
    expect(getRepositoryNameFromURL("git@:owner/repo")).toBe(null);
    expect(getRepositoryNameFromURL("github.com:owner/repo.git")).toBe(null);
    expect(getRepositoryNameFromURL("git@github.com:/repo.git")).toBe(null);
    expect(getRepositoryNameFromURL("ftp://github.com/owner/repo.git")).toBe(
      null,
    );
    expect(getRepositoryNameFromURL("https://github.com/owner")).toBe(null);
  });

  it("handles edge cases with special characters in host", () => {
    expect(
      getRepositoryNameFromURL("git@git-server.domain.co.uk:owner/repo.git"),
    ).toBe("owner/repo");
    expect(
      getRepositoryNameFromURL("git@my-git-123.example.org:user/project"),
    ).toBe("user/project");
    expect(
      getRepositoryNameFromURL(
        "https://git-server.domain.co.uk/owner/repo.git",
      ),
    ).toBe("owner/repo");
  });

  it("handles repository names that end with .git in the middle", () => {
    expect(
      getRepositoryNameFromURL("git@github.com:owner/repo.git.backup.git"),
    ).toBe("owner/repo.git.backup");
    expect(getRepositoryNameFromURL("git@github.com:owner/my.git.repo")).toBe(
      "owner/my.git.repo",
    );
    expect(
      getRepositoryNameFromURL("https://github.com/owner/repo.git.backup.git"),
    ).toBe("owner/repo.git.backup");
    expect(
      getRepositoryNameFromURL("https://github.com/owner/my.git.repo"),
    ).toBe("owner/my.git.repo");
  });

  it("parses URLs with ports and credentials", () => {
    expect(
      getRepositoryNameFromURL(
        "https://user:pass@github.com:443/owner/repo.git",
      ),
    ).toBe("owner/repo");
    expect(getRepositoryNameFromURL("http://user@github.com/owner/repo")).toBe(
      "owner/repo",
    );
    expect(
      getRepositoryNameFromURL("git://user@github.com/owner/repo.git"),
    ).toBe("owner/repo");
  });
});
