import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import githubActions from "./services/github-actions";
import type { Context } from "./types";

describe("GitHub Actions merge queue", () => {
  afterEach(() => {
    delete process.env.GITHUB_EVENT_NAME;
  });

  it("extracts merge queue pr numbers from merge_group payload without API access", async () => {
    const dir = mkdtempSync(join(tmpdir(), "argos-gha-"));
    const eventPath = join(dir, "event.json");

    writeFileSync(
      eventPath,
      JSON.stringify({
        action: "checks_requested",
        merge_group: {
          head_ref:
            "gh-readonly-queue/merge-queue-argos/pr-1559-0bccfee0e5c6d7b3f72d0cab06cc79fc70666e08",
        },
      }),
    );

    process.env.GITHUB_EVENT_NAME = "merge_group";

    const context: Context = {
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "merge_group",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_SHA: "f16f980bd17cccfa93a1ae7766727e67950773d0",
        DISABLE_GITHUB_TOKEN_WARNING: "true",
      },
    };

    const config = await githubActions.config(context);

    expect(config.mergeQueuePrNumbers).toEqual([1559]);

    rmSync(dir, { recursive: true, force: true });
  });
});
