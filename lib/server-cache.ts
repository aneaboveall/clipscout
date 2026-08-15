type CacheEntry<T> = { value: T; expiresAt: number };

const globalCache = globalThis as typeof globalThis & {
  __clipScoutCache?: Map<string, CacheEntry<unknown>>;
  __clipScoutInflight?: Map<string, Promise<unknown>>;
};

const cache = globalCache.__clipScoutCache ?? new Map<string, CacheEntry<unknown>>();
const inflight = globalCache.__clipScoutInflight ?? new Map<string, Promise<unknown>>();
globalCache.__clipScoutCache = cache;
globalCache.__clipScoutInflight = inflight;

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  const value = await request;

  if (cache.size > 500) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(entryKey);
    }
  }
  return value;
}
