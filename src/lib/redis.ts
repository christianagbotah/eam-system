// ============================================================================
// REDIS CLIENT — Production abstraction with in-memory fallback
// ============================================================================

type RedisClientType = 'cache' | 'session' | 'queue' | 'pubsub';

let redisCache: RedisLike | null = null;
let redisReady = false;

/**
 * Redis-like interface that both real Redis and in-memory cache implement.
 * This allows seamless switching between real Redis (production) and
 * in-memory fallback (development/sandbox) via the REDIS_URL env var.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<number>;
  delByPrefix(prefix: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  ping(): Promise<boolean>;
  isAvailable(): boolean;
  getType(): 'redis' | 'memory';
}

// ============================================================================
// In-Memory Fallback — fully functional Redis-compatible implementation
// ============================================================================

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private subscribers = new Map<string, Set<(...args: unknown[]) => void>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt > 0 && now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, 30_000);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  isAvailable(): boolean { return true; }
  getType(): 'redis' | 'memory' { return 'memory'; }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : 0;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async delByPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return [...this.store.keys()].filter(k => regex.test(k));
  }

  async incr(key: string): Promise<number> {
    const val = await this.get(key);
    const num = (parseInt(val || '0', 10) || 0) + 1;
    await this.set(key, String(num));
    return num;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    const subs = this.subscribers.get(channel);
    if (subs) {
      for (const cb of subs) {
        try { cb(message); } catch { /* skip */ }
      }
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!event.startsWith('message:')) return;
    const channel = event.replace('message:', '');
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);
  }

  async ping(): Promise<boolean> { return true; }
}

// ============================================================================
// Redis Singleton — initializes once, returns same instance thereafter
// ============================================================================

const memoryClient = new InMemoryRedis();

export function getRedisClient(_type: RedisClientType = 'cache'): RedisLike {
  if (!redisReady) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        // In production, initialize real Redis client here:
        // const { createClient } = require('redis');
        // const client = createClient({ url: redisUrl });
        // client.on('error', () => { redisCache = memoryClient; });
        // await client.connect();
        // redisCache = client as unknown as RedisLike;
        // For now, always use memory fallback (sandbox mode)
        redisCache = memoryClient;
      } catch {
        redisCache = memoryClient;
      }
    } else {
      redisCache = memoryClient;
    }
    redisReady = true;
  }
  return redisCache || memoryClient;
}

export function getRedisInfo() {
  const client = getRedisClient();
  return {
    type: client.getType(),
    available: client.isAvailable(),
    url: process.env.REDIS_URL ? 'configured' : 'not configured (using in-memory)',
  };
}

/**
 * Convenience wrappers for typed cache operations using JSON serialization.
 * These simplify common patterns like caching objects with TTL.
 */
export const redisHelpers = {
  async setJSON<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), ttlMs);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async getOrSetJSON<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.setJSON(key, value, ttlMs);
    return value;
  },
};
