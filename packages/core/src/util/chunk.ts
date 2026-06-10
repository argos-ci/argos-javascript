/**
 * Split an array into chunks of a given size.
 */
export const chunk = <T>(collection: T[], size: number) => {
  const result = [];

  // add each chunk to the result
  for (let x = 0; x < Math.ceil(collection.length / size); x++) {
    const start = x * size;
    const end = start + size;

    result.push(collection.slice(start, end));
  }

  return result;
};

/**
 * Map over a collection asynchronously, processing at most `size` items
 * concurrently to limit memory pressure.
 */
export async function mapInChunks<T, R>(
  collection: T[],
  size: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (const items of chunk(collection, size)) {
    results.push(...(await Promise.all(items.map(mapper))));
  }

  return results;
}
