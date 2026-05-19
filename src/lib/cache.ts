// ============================================================================
// IN-MEMORY CACHE — TTL-based cache for frequently accessed data
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    // Don't prevent Node.js from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get a value from cache. Returns null if expired or not found.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in cache with a TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttlMs: number = 60_000): void {
    // Delete old entry first
    this.store.delete(key);

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
      hits: 0,
    };

    this.store.set(key, entry);
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern (prefix match)
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get or set — if key exists return cached, otherwise call factory and cache result
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number = 60_000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalEntries = 0;
    let totalHits = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        totalEntries++;
        totalHits += entry.hits;
      }
    }

    return {
      entries: totalEntries,
      expiredEntries,
      totalHits,
      hitRate: totalHits > 0 ? Math.round((totalHits / (totalHits + totalEntries)) * 100) : 0,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Pre-configured TTL constants
export const CACHE_TTL = {
  SHORT: 30_000,    // 30 seconds — real-time data
  MEDIUM: 120_000,  // 2 minutes — frequently changing data
  LONG: 300_000,    // 5 minutes — semi-static data
  VERY_LONG: 900_000, // 15 minutes — static/reference data
} as const;
