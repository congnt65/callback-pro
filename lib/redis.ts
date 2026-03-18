// In-process endpoint config cache — zero network overhead, works on any serverless platform.
// Entries expire after ENDPOINT_CACHE_TTL seconds. Cache is shared within a warm function instance.

const CACHE_TTL_MS = 300_000 // 5 minutes

interface CacheEntry {
  value: Record<string, unknown>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function cacheGet(key: string): Record<string, unknown> | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.value
}

export function cacheSet(key: string, value: Record<string, unknown>) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function cacheDel(key: string) {
  cache.delete(key)
}

export function endpointCacheKey(id: string) {
  return `ep:${id}`
}
