import { describe, expect, it, vi } from "vitest";
import { fetchPages } from "./pagination";

/** A fake endpoint serving `total` sequential items, page by page. */
function serve(total: number) {
  return vi.fn(async ({ page, perPage }: { page: string; perPage: string }) => {
    const size = Number(perPage);
    const start = (Number(page) - 1) * size;
    return {
      pageInfo: { total },
      results: Array.from(
        { length: Math.max(0, Math.min(size, total - start)) },
        (_, index) => start + index,
      ),
    };
  });
}

describe("fetchPages", () => {
  it("follows pagination until the limit is reached", async () => {
    const fetchPage = serve(500);
    const results = await fetchPages(250, fetchPage);
    expect(results).toHaveLength(250);
    expect(results.at(-1)).toBe(249);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    // The page size never changes, so the offsets the API derives stay aligned.
    expect(fetchPage).toHaveBeenLastCalledWith({ page: "3", perPage: "100" });
  });

  it("asks for no more than the limit on a single page", async () => {
    const fetchPage = serve(500);
    const results = await fetchPages(10, fetchPage);
    expect(results).toHaveLength(10);
    expect(fetchPage).toHaveBeenCalledExactlyOnceWith({
      page: "1",
      perPage: "10",
    });
  });

  it("stops at the server's total", async () => {
    const fetchPage = serve(3);
    const results = await fetchPages(100, fetchPage);
    expect(results).toEqual([0, 1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("caps the page size at 100", async () => {
    const fetchPage = serve(1000);
    await fetchPages(1000, fetchPage);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { page: "1", perPage: "100" });
  });

  it("returns nothing when there is nothing to list", async () => {
    const fetchPage = serve(0);
    await expect(fetchPages(100, fetchPage)).resolves.toEqual([]);
  });
});
