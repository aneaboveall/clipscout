type CacheEntry<T> = { value: T; expiresAt: number };

const globalCache = globalThis as typeof globalThis & {
  __clipScoutCache?: Map<string, CacheEntry<unknown>>;
};

const cache = globalCache.__clipScoutCache ?? new Map<string, CacheEntry<unknown>>();
globalCache.__clipScoutCache = cache;

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await fetcher();
  cache.set(key, { value, expiresAt: now + ttlMs });

  if (cache.size > 500) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(entryKey);
    }
  }
  return value;
}
