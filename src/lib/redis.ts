// ============================================================================
// REDIS CLIENT — Production abstraction with in-memory fallback
// ============================================================================

import Redis from 'ioredis';
import { createLogger } from '@/lib/logger';

const logger = createLogger('redis');

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
// Real Redis — production ioredis-backed implementation
// ============================================================================

class RealRedis implements RedisLike {
  private client: Redis;
  private subscriber: Redis; // Separate connection for pub/sub (ioredis requirement)
  private _available = false;
  private connecting = false;

  constructor(url: string) {
    const retryStrategy = (times: number): number => {
      if (times > 20) {
        logger.error('Redis max retry attempts reached, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 5000); // Exponential backoff: 200ms, 400ms, ... up to 5s
      logger.warn(`Redis connection retry #${times}, next attempt in ${delay}ms`);
      return delay;
    };

    // Main client for commands
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // Separate connection dedicated to pub/sub
    this.subscriber = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // --- Connection lifecycle logging ---
    this.client.on('connect', () => {
      logger.info('Redis main client connecting…');
    });

    this.client.on('ready', () => {
      this._available = true;
      this.connecting = false;
      logger.info('Redis main client ready');
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis main client error', { error: err.message });
      this._available = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis main client connection closed');
      this._available = false;
    });

    this.client.on('reconnecting', () => {
      this.connecting = true;
      logger.info('Redis main client reconnecting…');
    });

    this.client.on('end', () => {
      logger.warn('Redis main client connection ended (no more reconnections)');
      this._available = false;
    });

    // Subscriber lifecycle
    this.subscriber.on('ready', () => {
      logger.info('Redis subscriber client ready');
    });

    this.subscriber.on('error', (err: Error) => {
      logger.error('Redis subscriber client error', { error: err.message });
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      // Fan out subscriber messages to our internal listener map
      const subs = this.subscriberListeners.get(channel);
      if (subs) {
        for (const cb of subs) {
          try { cb(message); } catch (e) { logger.error('Subscriber callback error', { error: e }); }
        }
      }
    });

    // Auto-connect
    this.connecting = true;
    this.client.connect().catch((err: Error) => {
      logger.error('Redis initial connection failed', { error: err.message });
      this._available = false;
      this.connecting = false;
    });
    this.subscriber.connect().catch((err: Error) => {
      logger.error('Redis subscriber initial connection failed', { error: err.message });
    });
  }

  // ------- Internal listener map for pub/sub -------
  private subscriberListeners = new Map<string, Set<(...args: unknown[]) => void>>();

  // ------- RedisLike implementation -------

  isAvailable(): boolean {
    return this._available;
  }

  getType(): 'redis' | 'memory' {
    return 'redis';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs && ttlMs > 0) {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delByPrefix(prefix: string): Promise<number> {
    const matchingKeys = await this.client.keys(`${prefix}*`);
    if (matchingKeys.length === 0) return 0;
    const pipeline = this.client.pipeline();
    for (const key of matchingKeys) {
      pipeline.del(key);
    }
    const results = await pipeline.exec();
    return results?.filter(r => r && r[1] === 1).length ?? 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!event.startsWith('message:')) return;
    const channel = event.replace('message:', '');
    if (!this.subscriberListeners.has(channel)) {
      this.subscriberListeners.set(channel, new Set());
      // Subscribe on the dedicated subscriber connection
      this.subscriber.subscribe(channel).catch((err: Error) => {
        logger.error(`Failed to subscribe to channel [${channel}]`, { error: err.message });
      });
    }
    this.subscriberListeners.get(channel)!.add(callback);
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Gracefully close both connections. Call on process shutdown.
   */
  async quit(): Promise<void> {
    try {
      await this.subscriber.quit();
    } catch { /* ignore */ }
    try {
      await this.client.quit();
    } catch { /* ignore */ }
    this._available = false;
    logger.info('Redis connections closed gracefully');
  }
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
        const realRedis = new RealRedis(redisUrl);
        redisCache = realRedis;
        logger.info(`Redis client initialized (REDIS_URL detected, type=production)`);
      } catch (err) {
        logger.warn('Failed to create Redis client, falling back to in-memory', {
          error: err instanceof Error ? err.message : String(err),
        });
        redisCache = memoryClient;
      }
    } else {
      logger.info('No REDIS_URL configured, using in-memory Redis fallback');
      redisCache = memoryClient;
    }
    redisReady = true;
  }
  return redisCache || memoryClient;
}

/**
 * Close the Redis connection gracefully. Useful for process shutdown.
 * No-op when using in-memory fallback.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisCache && redisCache instanceof RealRedis) {
    await redisCache.quit();
  }
}

export function getRedisInfo() {
  const client = getRedisClient();
  return {
    type: client.getType(),
    available: client.isAvailable(),
    url: process.env.REDIS_URL
      ? (client.getType() === 'redis' ? 'configured (connected)' : 'configured (using in-memory fallback)')
      : 'not configured (using in-memory)',
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
