import type { Command } from "commander";
import { unwrap } from "../../lib/api";
import { formatBuilds } from "../../lib/format";
import { fetchPages } from "../../lib/pagination";
import { handleCliError, output, type BaseCommandOptions } from "../../lib/run";
import { resolveProjectTarget } from "../../lib/target";
import {
  buildProjectPathOption,
  jsonOption,
  limitOption,
  toLimit,
  tokenOption,
  type LimitOption,
} from "../../options";

type ListOptions = BaseCommandOptions &
  LimitOption & {
    branch?: string | undefined;
    commit?: string | undefined;
    search?: string | undefined;
  };

export function registerBuildList(build: Command) {
  build
    .command("list")
    .description("List a project's builds, most recent first")
    .option("--branch <name>", "Only list the builds of this branch")
    .option(
      "--commit <sha>",
      "Only list the builds of this commit, given as a full 40-character SHA. Use --search to match a prefix",
    )
    .option(
      "--search <query>",
      "Match builds on their name, branch (substring) or commit (prefix)",
    )
    .addOption(limitOption)
    .addOption(tokenOption)
    .addOption(buildProjectPathOption)
    .addOption(jsonOption)
    .action(async (options: ListOptions) => {
      try {
        const { client, owner, project } = await resolveProjectTarget(options, {
          auth: "project",
        });
        const builds = await fetchPages(
          toLimit(options.limit),
          async (pagination) =>
            unwrap(
              await client.GET("/projects/{owner}/{project}/builds", {
                params: {
                  path: { owner, project },
                  query: {
                    ...pagination,
                    ...(options.branch ? { head: options.branch } : {}),
                    ...(options.commit ? { headSha: options.commit } : {}),
                    ...(options.search ? { search: options.search } : {}),
                  },
                },
              }),
            ),
        );
        output(builds, options, formatBuilds);
      } catch (error) {
        handleCliError(error, "project");
      }
    });
}
