import { CliError } from "./cli-error";
import { sanitizeTerminalText } from "./terminal";
import { getUserAgent } from "./user-agent";

/**
 * Searching the Argos documentation.
 *
 * The docs are published on GitBook, which serves every public site with a
 * Model Context Protocol endpoint at `<site>/~gitbook/mcp`. Its
 * `searchDocumentation` tool needs no token — unlike GitBook's REST search,
 * which wants an API token that a published CLI could not keep secret.
 *
 * The endpoint is stateless, so a single `tools/call` request is enough: no
 * `initialize` handshake or session to carry between calls.
 */

/** Root of the published Argos documentation. */
export const DOCS_URL = "https://argos-ci.com/docs";

const MCP_ENDPOINT = `${DOCS_URL}/~gitbook/mcp`;

/** Most results the search tool returns for a single query. */
export const MAX_DOCS_SEARCH_RESULTS = 10;

/**
 * A cold search can take well over ten seconds; past this, the request is
 * abandoned rather than left hanging.
 */
const TIMEOUT_MS = 30_000;

export type DocsSearchResult = {
  title: string;
  url: string;
  /** The passage of the page that matched, when the search returned one. */
  excerpt: string | null;
};

type ToolContent = { type: string; text?: string };

type JsonRpcResponse = {
  id?: unknown;
  result?: { content?: ToolContent[]; isError?: boolean };
  error?: { message?: unknown };
};

/**
 * One search hit, as the tool renders it:
 *
 * ```
 * Title: <page title>
 * Link: <page URL>
 * Content: <matching passage, possibly several paragraphs>
 * ```
 *
 * `Content` is left out when the page has no passage to show.
 */
const RESULT_REGEX =
  /^Title: ([^\n]*)\nLink: ([^\n]*)(?:\nContent: ([\s\S]*))?/;

/** Parse the tool's text blocks into results, skipping any it can't read. */
export function parseDocsSearchContent(
  content: ToolContent[],
): DocsSearchResult[] {
  const results: DocsSearchResult[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "text" || !block.text) {
      continue;
    }
    const match = RESULT_REGEX.exec(block.text);
    const title = match?.[1]?.trim();
    const url = match?.[2]?.trim();
    if (!title || !url) {
      continue;
    }
    // Several passages of one page would list the page twice.
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    results.push({ title, url, excerpt: match?.[3]?.trim() || null });
  }
  return results;
}

/**
 * Read the JSON-RPC response out of the body. The endpoint answers with a
 * server-sent event stream — one `message` event per JSON-RPC message — but
 * may answer with plain JSON, which the protocol allows too.
 */
export function parseMcpResponse(
  body: string,
  contentType: string | null,
): JsonRpcResponse {
  if (!contentType?.includes("text/event-stream")) {
    return JSON.parse(body) as JsonRpcResponse;
  }
  // An event's data can span several `data:` lines, joined by newlines.
  for (const event of body.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).replace(/^ /, ""))
      .join("\n");
    if (!data) {
      continue;
    }
    const message = JSON.parse(data) as JsonRpcResponse;
    if ("result" in message || "error" in message) {
      return message;
    }
  }
  throw new CliError("The documentation search returned no response.");
}

/** Search the Argos documentation, best match first. */
export async function searchDocs(
  query: string,
  options: { limit: number },
): Promise<DocsSearchResult[]> {
  const userAgent = getUserAgent();
  let response: Response;
  try {
    response = await fetch(MCP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(userAgent ? { "User-Agent": userAgent } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "searchDocumentation", arguments: { query } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliError(`Could not reach ${DOCS_URL}: ${reason}`);
  }

  if (!response.ok) {
    throw new CliError(
      `The documentation search failed with HTTP ${response.status}.`,
    );
  }

  const message = parseMcpResponse(
    await response.text(),
    response.headers.get("content-type"),
  );
  if (message.error) {
    throw new CliError(
      `The documentation search failed: ${sanitizeTerminalText(message.error.message) || "unknown error"}`,
    );
  }
  const content = message.result?.content ?? [];
  if (message.result?.isError) {
    const text = content.map((block) => block.text ?? "").join(" ");
    throw new CliError(
      `The documentation search failed: ${sanitizeTerminalText(text) || "unknown error"}`,
    );
  }
  return parseDocsSearchContent(content).slice(0, options.limit);
}
