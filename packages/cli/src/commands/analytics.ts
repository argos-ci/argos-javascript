import { type Command, Option } from "commander";
import { createApiClient, unwrap } from "../lib/api";
import { fail } from "../lib/cli-error";
import { formatAnalytics } from "../lib/format";
import { handleCliError, output } from "../lib/run";
import { resolveToken } from "../lib/target";
import { jsonOption, tokenOption } from "../options";

type GroupBy = "day" | "week" | "month";

type AnalyticsOptions = {
  account?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  groupBy: GroupBy;
  project?: string[] | undefined;
  token?: string | undefined;
  json?: boolean | undefined;
};

const DEFAULT_PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Coerce a user-supplied date into an ISO 8601 datetime, or fail cleanly. */
function toIsoOrFail(value: string, option: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    fail(`Invalid --${option} value: "${value}". Use an ISO 8601 datetime.`);
  }
  return date.toISOString();
}

/** Collect a repeatable `--project` flag into an array of project names. */
function collectProject(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export function analyticsCommand(program: Command) {
  program
    .command("analytics")
    .description("Fetch build and screenshot analytics for an account")
    .option(
      "--account <slug>",
      "Slug of the account (personal or team) to fetch analytics for",
    )
    .option(
      "--from <datetime>",
      `Start of the analytics period (ISO 8601). Defaults to ${DEFAULT_PERIOD_DAYS} days ago.`,
    )
    .option(
      "--to <datetime>",
      "End of the analytics period (ISO 8601). Defaults to now.",
    )
    .addOption(
      new Option(
        "--group-by <period>",
        "Time period used to group each series data point",
      )
        .choices(["day", "week", "month"])
        .default("day"),
    )
    .option(
      "--project <name>",
      "Filter by project name. Repeat the flag to include multiple projects.",
      collectProject,
    )
    .addOption(tokenOption)
    .addOption(jsonOption)
    .action(async (options: AnalyticsOptions) => {
      try {
        const accountSlug = options.account || process.env["ARGOS_ACCOUNT"];
        if (!accountSlug) {
          fail(
            "An account is required. Use --account <slug> or set ARGOS_ACCOUNT.",
          );
        }
        const from = options.from
          ? toIsoOrFail(options.from, "from")
          : new Date(Date.now() - DEFAULT_PERIOD_DAYS * DAY_MS).toISOString();
        const to = options.to ? toIsoOrFail(options.to, "to") : undefined;

        const client = createApiClient(
          await resolveToken({ token: options.token }),
        );
        const analytics = unwrap(
          await client.GET("/accounts/{accountSlug}/analytics", {
            params: {
              path: { accountSlug },
              query: {
                from,
                to,
                groupBy: options.groupBy,
                projectNames: options.project,
              },
            },
          }),
        );
        output(analytics, options, (data) =>
          formatAnalytics(data, {
            account: accountSlug,
            from,
            to,
            groupBy: options.groupBy,
          }),
        );
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
