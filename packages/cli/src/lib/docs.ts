import { fail } from "./cli-error";
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

/**
 * The link as a normalized `https:` URL, or `null` when it is not one. The URL
 * serializer percent-encodes control and non-ASCII characters, so the result
 * is safe to print as-is and to hand to `curl`.
 */
function toHttpsUrl(link: string | undefined): string | null {
  if (!link || !URL.canParse(link)) {
    return null;
  }
  const url = new URL(link);
  return url.protocol === "https:" ? url.href : null;
}

/** Parse the tool's text blocks into results, skipping any it can't read. */
export function parseDocsSearchContent(
  content: ToolContent[],
): DocsSearchResult[] {
  // Keyed by URL: several passages of one page would list the page twice.
  const results = new Map<string, DocsSearchResult>();
  for (const block of content) {
    if (block.type !== "text" || !block.text) {
      continue;
    }
    const match = RESULT_REGEX.exec(block.text);
    const title = match?.[1]?.trim();
    const url = toHttpsUrl(match?.[2]);
    if (!title || !url || results.has(url)) {
      continue;
    }
    results.set(url, { title, url, excerpt: match?.[3]?.trim() || null });
  }
  return [...results.values()];
}

/**
 * Read the JSON-RPC response out of the body. The endpoint answers with a
 * server-sent event stream, each JSON-RPC message on one `data:` line, but may
 * answer with plain JSON, which the protocol allows too.
 */
function parseMcpResponse(
  body: string,
  contentType: string | null,
): JsonRpcResponse {
  if (!contentType?.includes("text/event-stream")) {
    return JSON.parse(body) as JsonRpcResponse;
  }
  for (const line of body.split("\n")) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const message = JSON.parse(line.slice("data:".length)) as JsonRpcResponse;
    if ("result" in message || "error" in message) {
      return message;
    }
  }
  fail("The documentation search returned no response.");
}

/** Search the Argos documentation, best match first. */
export async function searchDocs(
  query: string,
  options: { limit: number },
): Promise<DocsSearchResult[]> {
  const userAgent = getUserAgent();
  const response = await fetch(MCP_ENDPOINT, {
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
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    fail(`Could not reach ${DOCS_URL}: ${reason}`);
  });

  if (!response.ok) {
    fail(`The documentation search failed with HTTP ${response.status}.`);
  }

  const message = parseMcpResponse(
    await response.text(),
    response.headers.get("content-type"),
  );
  const content = message.result?.content ?? [];
  if (message.error || message.result?.isError) {
    const reason = message.error
      ? message.error.message
      : content.map((block) => block.text ?? "").join(" ");
    fail(
      `The documentation search failed: ${sanitizeTerminalText(reason) || "unknown error"}`,
    );
  }
  return parseDocsSearchContent(content).slice(0, options.limit);
}
