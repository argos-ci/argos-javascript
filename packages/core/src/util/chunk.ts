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
 * Split items into chunks whose serialized JSON size stays under `maxBytes`.
 * An item larger than `maxBytes` on its own gets its own chunk.
 */
export const chunkBySize = <T>(items: T[], maxBytes: number): T[][] => {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentBytes = 0;
  for (const item of items) {
    const size = Buffer.byteLength(JSON.stringify(item));
    if (current.length > 0 && currentBytes + size > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(item);
    currentBytes += size;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
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
