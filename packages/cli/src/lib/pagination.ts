/** Largest page the API serves. */
const MAX_PER_PAGE = 100;

type Page<T> = {
  results: T[];
  pageInfo: { total: number };
};

/**
 * Walk a paginated endpoint until `limit` items have been collected, the server
 * runs out of results, or its reported total is reached.
 *
 * `fetchPage` receives the page number and the size to request, both already
 * stringified — every paginated Argos endpoint takes them as query strings.
 */
export async function fetchPages<T>(
  limit: number,
  fetchPage: (params: { page: string; perPage: string }) => Promise<Page<T>>,
): Promise<T[]> {
  // The page size stays constant: the API turns `page` into an offset by
  // multiplying it by `perPage`, so shrinking it on the last page would skip
  // items. Overshooting the limit is trimmed below instead.
  const perPage = String(Math.min(MAX_PER_PAGE, limit));
  const results: T[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage({ page: String(page), perPage });
    results.push(...data.results);
    if (
      results.length >= limit ||
      results.length >= data.pageInfo.total ||
      data.results.length === 0
    ) {
      break;
    }
  }
  return results.slice(0, limit);
}
