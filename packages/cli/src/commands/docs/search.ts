import { type Command, Option } from "commander";
import { fail } from "../../lib/cli-error";
import { DOCS_URL, MAX_DOCS_SEARCH_RESULTS, searchDocs } from "../../lib/docs";
import { formatDocsSearchResults } from "../../lib/format";
import { handleCliError, output } from "../../lib/run";
import {
  jsonOption,
  toLimit,
  type JsonOption,
  type LimitOption,
} from "../../options";

const DEFAULT_DOCS_LIMIT = 5;

export function registerDocsSearch(docs: Command) {
  docs
    .command("search")
    .description(`Search the Argos documentation (${DOCS_URL})`)
    .argument("<query...>", 'What to look for, e.g. "parallel builds"')
    .addOption(
      new Option(
        "--limit <number>",
        `Maximum number of results, up to ${MAX_DOCS_SEARCH_RESULTS}`,
      ).default(String(DEFAULT_DOCS_LIMIT)),
    )
    .addOption(jsonOption)
    .addHelpText(
      "after",
      [
        "",
        "No token needed. Read a result in full as Markdown by appending .md to",
        "its URL, or by requesting it with an `Accept: text/markdown` header:",
        "",
        '  url=$(argos docs search "parallel builds" --json | jq -r ".[0].url")',
        '  curl -H "Accept: text/markdown" "$url"',
      ].join("\n"),
    )
    .action(async (words: string[], options: JsonOption & LimitOption) => {
      try {
        const query = words.join(" ").trim();
        if (!query) {
          fail("A search query is required.");
        }
        const limit = toLimit(options.limit, {
          max: MAX_DOCS_SEARCH_RESULTS,
        });
        const results = await searchDocs(query, { limit });
        output(results, options, (data) =>
          formatDocsSearchResults(data, query),
        );
      } catch (error) {
        handleCliError(error);
      }
    });
}
