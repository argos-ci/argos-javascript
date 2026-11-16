import { type Command, Option } from "commander";
import { createApiClient, unwrap } from "../lib/api";
import { fail } from "../lib/cli-error";
import { formatAnalytics } from "../lib/format";
import { handleCliError, output } from "../lib/run";
import { resolveToken } from "../lib/target";
import {
  checkTimeZone,
  getStartOfDayDaysAgo,
  parseDateTimeOrFail,
} from "../lib/time-zone";
import { jsonOption, tokenOption } from "../options";

type GroupBy = "day" | "week" | "month";

type AnalyticsOptions = {
  account?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  groupBy: GroupBy;
  timeZone?: string | undefined;
  project?: string[] | undefined;
  token?: string | undefined;
  json?: boolean | undefined;
};

const DEFAULT_PERIOD_DAYS = 30;

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
      `Start of the analytics period, as a date (2026-11-02) or an ISO 8601 datetime. A date or a time without an offset is read in --time-zone. Defaults to midnight ${DEFAULT_PERIOD_DAYS} days ago.`,
    )
    .option(
      "--to <datetime>",
      "End of the analytics period, as a date or an ISO 8601 datetime. A date includes the whole day. Defaults to now.",
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
      "--time-zone <iana>",
      "IANA time zone that days, weeks and months start in, such as Europe/Paris. Defaults to UTC. The Analytics page uses your browser's time zone.",
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
        const timeZone = options.timeZone ?? "UTC";
        checkTimeZone(timeZone);
        const from = options.from
          ? parseDateTimeOrFail(options.from, "from", { timeZone })
          : getStartOfDayDaysAgo(DEFAULT_PERIOD_DAYS, timeZone, new Date());
        const to = options.to
          ? parseDateTimeOrFail(options.to, "to", { timeZone, endOfDay: true })
          : undefined;

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
                timeZone: options.timeZone,
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
            timeZone,
          }),
        );
      } catch (error) {
        handleCliError(error, "user");
      }
    });
}
