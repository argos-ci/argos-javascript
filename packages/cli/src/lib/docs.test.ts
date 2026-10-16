import { afterEach, describe, expect, it, vi } from "vitest";
import { CliError } from "./cli-error";
import { parseDocsSearchContent, searchDocs } from "./docs";

/** A search hit as the GitBook `searchDocumentation` tool renders it. */
function hit(title: string, url: string, content?: string) {
  return {
    type: "text",
    text: `Title: ${title}\nLink: ${url}${content === undefined ? "" : `\nContent: ${content}`}`,
  };
}

/** Wrap a JSON-RPC message the way the endpoint streams it back. */
function sse(message: unknown) {
  return `event: message\ndata: ${JSON.stringify(message)}\n\n`;
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Answer the next search with this JSON-RPC message, as an event stream. */
function mockSearch(message: unknown) {
  return mockFetch(
    new Response(sse(message), {
      headers: { "content-type": "text/event-stream" },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseDocsSearchContent", () => {
  it("reads the title, link and passage of each hit", () => {
    expect(
      parseDocsSearchContent([
        hit(
          "Baseline build",
          "https://argos-ci.com/docs/learn/baseline-build",
          "Argos compares screenshots\n\nto a baseline.",
        ),
      ]),
    ).toEqual([
      {
        title: "Baseline build",
        url: "https://argos-ci.com/docs/learn/baseline-build",
        excerpt: "Argos compares screenshots\n\nto a baseline.",
      },
    ]);
  });

  it("keeps a hit that has no passage", () => {
    expect(
      parseDocsSearchContent([hit("Blog post", "https://argos-ci.com/blog")]),
    ).toEqual([
      { title: "Blog post", url: "https://argos-ci.com/blog", excerpt: null },
    ]);
  });

  it("lists a page once, at its best rank", () => {
    const results = parseDocsSearchContent([
      hit("CLI", "https://argos-ci.com/docs/cli", "first passage"),
      hit("Playwright", "https://argos-ci.com/docs/playwright", "passage"),
      hit("CLI", "https://argos-ci.com/docs/cli", "second passage"),
    ]);
    expect(results.map((result) => result.excerpt)).toEqual([
      "first passage",
      "passage",
    ]);
  });

  it("normalizes links, and skips one that is not an https URL", () => {
    expect(
      parseDocsSearchContent([
        hit("Insecure", "http://argos-ci.com/docs/cli"),
        hit("Not a URL", "argos-ci.com/docs"),
        hit("CLI", "https://argos-ci.com/docs/cli guide\u001B[2K"),
      ]).map((result) => result.url),
    ).toEqual(["https://argos-ci.com/docs/cli%20guide%1B[2K"]);
  });

  it("skips blocks it cannot read", () => {
    expect(
      parseDocsSearchContent([
        { type: "image" },
        { type: "text", text: "Something unexpected" },
        hit("CLI", "https://argos-ci.com/docs/cli"),
      ]),
    ).toHaveLength(1);
  });
});

describe("searchDocs", () => {
  it("calls the search tool of the docs MCP endpoint", async () => {
    const fetchMock = mockSearch({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [hit("CLI", "https://argos-ci.com/docs/cli")] },
    });

    await expect(searchDocs("parallel builds", { limit: 5 })).resolves.toEqual([
      { title: "CLI", url: "https://argos-ci.com/docs/cli", excerpt: null },
    ]);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://argos-ci.com/docs/~gitbook/mcp");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      method: "tools/call",
      params: {
        name: "searchDocumentation",
        arguments: { query: "parallel builds" },
      },
    });
  });

  it("returns no more results than the limit", async () => {
    mockSearch({
      id: 1,
      result: {
        content: [1, 2, 3].map((n) =>
          hit(`Page ${n}`, `https://argos-ci.com/docs/${n}`),
        ),
      },
    });
    const results = await searchDocs("page", { limit: 2 });
    expect(results.map((result) => result.title)).toEqual(["Page 1", "Page 2"]);
  });

  it("reads a plain JSON response", async () => {
    mockFetch(
      Response.json({
        id: 1,
        result: { content: [hit("CLI", "https://argos-ci.com/docs/cli")] },
      }),
    );
    await expect(searchDocs("cli", { limit: 5 })).resolves.toHaveLength(1);
  });

  it("fails when the stream carries no response", async () => {
    mockFetch(
      new Response("", { headers: { "content-type": "text/event-stream" } }),
    );
    await expect(searchDocs("anything", { limit: 5 })).rejects.toThrow(
      CliError,
    );
  });

  it("fails on an HTTP error", async () => {
    mockFetch(new Response("Not found", { status: 404 }));
    await expect(searchDocs("anything", { limit: 5 })).rejects.toThrow(
      "The documentation search failed with HTTP 404.",
    );
  });

  it("fails on a JSON-RPC error, without letting it drive the terminal", async () => {
    mockSearch({ id: 1, error: { message: "\u001B[2KTool not found" } });
    await expect(searchDocs("anything", { limit: 5 })).rejects.toThrow(
      "The documentation search failed: Tool not found",
    );
  });

  it("fails when the tool reports an error", async () => {
    mockSearch({
      id: 1,
      result: {
        isError: true,
        content: [{ type: "text", text: "Search is unavailable" }],
      },
    });
    await expect(searchDocs("anything", { limit: 5 })).rejects.toThrow(
      "The documentation search failed: Search is unavailable",
    );
  });

  it("fails cleanly when the docs cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(searchDocs("anything", { limit: 5 })).rejects.toThrow(
      "Could not reach https://argos-ci.com/docs: fetch failed",
    );
  });
});
