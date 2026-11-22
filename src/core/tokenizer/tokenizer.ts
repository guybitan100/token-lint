import { encode } from 'gpt-tokenizer';

const cache = new Map<string, number>();
const MAX_CACHE_SIZE = 2048;

/**
 * Returns token count for a string, with LRU-eviction caching
 * to avoid redundant encoding of repeated content.
 */
export function tokenCount(text: string): number {
  if (!text) return 0;

  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  const count = encode(text).length;

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value!;
    cache.delete(firstKey);
  }

  cache.set(text, count);
  return count;
}

export function clearTokenCache(): void {
  cache.clear();
}
