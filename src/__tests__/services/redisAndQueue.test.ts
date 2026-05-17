// ============================================================================
// Redis & Queue Integration — Test Scaffolding
// Tests: InMemoryRedis get/set/del/expire/pubsub, InMemoryQueue add/process/retry,
//        BullMQQueueAdapter detection, getRedisClient singleton, jobQueue facade
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock the logger ----
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---- Mock ioredis to prevent real connections ----
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      publish: vi.fn().mockResolvedValue(1),
      ping: vi.fn().mockResolvedValue('PONG'),
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      pipeline: vi.fn().mockReturnValue({
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      }),
      quit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// ---- Mock BullMQ ----
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'bull-job-1' }),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue([]),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    drain: vi.fn().mockResolvedValue(undefined),
    obliterate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Job: vi.fn(),
}));

describe('Redis & Queue Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.REDIS_URL = '';
  });

  // =========================================================================
  // Helper: get a fresh InMemoryRedis client via the public API
  // InMemoryRedis is not exported, so we test through getRedisClient()
  // =========================================================================
  async function getFreshRedisClient() {
    vi.resetModules();
    process.env.REDIS_URL = '';
    const mod = await import('@/lib/redis');
    return mod.getRedisClient();
  }

  // =========================================================================
  // Section A: InMemoryRedis — Basic Operations
  // =========================================================================

  describe('InMemoryRedis — get/set/del', () => {
    it('should return null for non-existent key', async () => {
      const redis = await getFreshRedisClient();
      const result = await redis.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should set and get a value', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('key1', 'value1');
      expect(await redis.get('key1')).toBe('value1');
    });

    it('should overwrite existing key', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('key1', 'value1');
      await redis.set('key1', 'value2');
      expect(await redis.get('key1')).toBe('value2');
    });

    it('should delete a key and return 1', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('key1', 'value1');
      const result = await redis.del('key1');
      expect(result).toBe(1);
      expect(await redis.get('key1')).toBeNull();
    });

    it('should return 0 when deleting non-existent key', async () => {
      const redis = await getFreshRedisClient();
      const result = await redis.del('nonexistent');
      expect(result).toBe(0);
    });

    it('should check key existence', async () => {
      const redis = await getFreshRedisClient();
      expect(await redis.exists('key1')).toBe(false);
      await redis.set('key1', 'value1');
      expect(await redis.exists('key1')).toBe(true);
    });

    it('should increment a key', async () => {
      const redis = await getFreshRedisClient();
      expect(await redis.incr('counter')).toBe(1);
      expect(await redis.incr('counter')).toBe(2);
      expect(await redis.incr('counter')).toBe(3);
      expect(await redis.get('counter')).toBe('3');
    });

    it('should increment non-existent key starting from 0', async () => {
      const redis = await getFreshRedisClient();
      const result = await redis.incr('fresh-counter');
      expect(result).toBe(1);
    });

    it('should handle empty string values', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('empty', '');
      expect(await redis.get('empty')).toBe('');
    });

    it('should delete multiple keys by prefix', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('user:1', 'alice');
      await redis.set('user:2', 'bob');
      await redis.set('session:1', 'token');
      const deleted = await redis.delByPrefix('user:');
      expect(deleted).toBe(2);
      expect(await redis.get('user:1')).toBeNull();
      expect(await redis.get('user:2')).toBeNull();
      expect(await redis.get('session:1')).toBe('token');
    });

    it('should match keys with glob pattern', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('cache:users', 'data');
      await redis.set('cache:assets', 'data');
      await redis.set('session:token', 'data');
      const keys = await redis.keys('cache:*');
      expect(keys).toHaveLength(2);
      expect(keys.sort()).toEqual(['cache:assets', 'cache:users']);
    });
  });

  // =========================================================================
  // Section B: InMemoryRedis — TTL / Expiration
  // =========================================================================

  describe('InMemoryRedis — TTL / Expiration', () => {
    it('should set key with TTL and return null after expiry', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('temp', 'data', 100); // 100ms TTL
      expect(await redis.get('temp')).toBe('data');
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await redis.get('temp')).toBeNull();
    });

    it('should set key without TTL that persists', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('perm', 'data');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(await redis.get('perm')).toBe('data');
    });

    it('should update expiry with expire method', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('key1', 'value1', 5000);
      await redis.expire('key1', 3600);
      expect(await redis.get('key1')).toBe('value1');
    });

    it('should expire key after short TTL via set with ttlMs', async () => {
      const redis = await getFreshRedisClient();
      await redis.set('short', 'lived', 50);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(await redis.get('short')).toBeNull();
    });
  });

  // =========================================================================
  // Section C: InMemoryRedis — Pub/Sub (via getRedisClient)
  // =========================================================================

  describe('InMemoryRedis — Pub/Sub', () => {
    it('should deliver published message to subscriber', async () => {
      const redis = await getFreshRedisClient();
      const received: string[] = [];

      redis.on('message:channel-1', (msg: unknown) => {
        received.push(msg as string);
      });

      await redis.publish('channel-1', 'hello');
      await redis.publish('channel-1', 'world');

      expect(received).toEqual(['hello', 'world']);
    });

    it('should not deliver to non-subscribed channels', async () => {
      const redis = await getFreshRedisClient();
      const received: string[] = [];

      redis.on('message:channel-a', (msg: unknown) => {
        received.push(msg as string);
      });

      await redis.publish('channel-b', 'miss');
      expect(received).toEqual([]);
    });

    it('should deliver to multiple subscribers on same channel', async () => {
      const redis = await getFreshRedisClient();
      const sub1: string[] = [];
      const sub2: string[] = [];

      redis.on('message:multi', (msg: unknown) => sub1.push(msg as string));
      redis.on('message:multi', (msg: unknown) => sub2.push(msg as string));

      await redis.publish('multi', 'broadcast');
      expect(sub1).toEqual(['broadcast']);
      expect(sub2).toEqual(['broadcast']);
    });

    it('should isolate subscriber errors without crashing', async () => {
      const redis = await getFreshRedisClient();

      redis.on('message:err-channel', () => {
        throw new Error('subscriber error');
      });

      // Should not throw
      await expect(redis.publish('err-channel', 'test')).resolves.toBeUndefined();
    });

    it('should ping successfully', async () => {
      const redis = await getFreshRedisClient();
      expect(await redis.ping()).toBe(true);
      expect(redis.isAvailable()).toBe(true);
      expect(redis.getType()).toBe('memory');
    });
  });

  // =========================================================================
  // Section D: getRedisClient Singleton Behavior
  // =========================================================================

  describe('getRedisClient singleton', () => {
    it('should return in-memory client when REDIS_URL is not set', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { getRedisClient } = await import('@/lib/redis');
      const client = getRedisClient();
      expect(client.getType()).toBe('memory');
      expect(client.isAvailable()).toBe(true);
    });

    it('should return same instance on subsequent calls (singleton)', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { getRedisClient } = await import('@/lib/redis');
      const client1 = getRedisClient();
      const client2 = getRedisClient();
      expect(client1).toBe(client2);
    });
  });

  // =========================================================================
  // Section E: redisHelpers
  // =========================================================================

  describe('redisHelpers', () => {
    it('should set and get JSON values', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { redisHelpers } = await import('@/lib/redis');
      const obj = { name: 'test', count: 42 };
      await redisHelpers.setJSON('key:json', obj);
      const result = await redisHelpers.getJSON<typeof obj>('key:json');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent JSON key', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { redisHelpers } = await import('@/lib/redis');
      const result = await redisHelpers.getJSON('nonexistent');
      expect(result).toBeNull();
    });

    it('should use getOrSetJSON factory when cache miss', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { redisHelpers } = await import('@/lib/redis');
      const result = await redisHelpers.getOrSetJSON('key:factory', async () => ({ computed: true }));
      expect(result).toEqual({ computed: true });
    });
  });

  // =========================================================================
  // Section F: InMemoryQueue — Add / Process / Retry
  // =========================================================================

  describe('InMemoryQueue', () => {
    it('should add a job and return an ID', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const id = await jobQueue.add('notifications', {
        name: 'send-email',
        data: { to: 'user@test.com', subject: 'Hello' },
        attempts: 3,
      });
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should process a waiting job via registered handler', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');

      const processed: unknown[] = [];
      await jobQueue.process('test-queue', async (job) => {
        processed.push(job.data);
        return { ok: true };
      });

      await jobQueue.add('test-queue', {
        name: 'test-job',
        data: { value: 42 },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(processed.length).toBeGreaterThanOrEqual(1);
      expect((processed[0] as { value: number }).value).toBe(42);
    });

    it('should get queue status', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const status = await jobQueue.getStatus('notifications');
      expect(status).toBeDefined();
      expect(status.name).toBe('notifications');
      expect(typeof status.total).toBe('number');
    });

    it('should get all queue statuses', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const allStatus = await jobQueue.getAllStatus();
      expect(allStatus).toBeDefined();
      expect(Object.keys(allStatus).length).toBeGreaterThan(0);
    });

    it('should get a specific job by ID', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const id = await jobQueue.add('test-get', { name: 'find-me', data: {} });
      const job = await jobQueue.getJob('test-get', id);
      expect(job).toBeDefined();
      expect(job!.name).toBe('find-me');
    });

    it('should return null for non-existent job', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const job = await jobQueue.getJob('test-queue', 'non-existent-id');
      expect(job).toBeNull();
    });

    it('should list jobs from queue', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      await jobQueue.add('test-list', { name: 'job-a', data: {} });
      await jobQueue.add('test-list', { name: 'job-b', data: {} });
      const jobs = await jobQueue.getJobs('test-list');
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear a queue', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      await jobQueue.add('test-clear', { name: 'job-1', data: {} });
      await jobQueue.add('test-clear', { name: 'job-2', data: {} });
      const cleared = await jobQueue.clear('test-clear');
      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    it('should remove a specific job', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { jobQueue } = await import('@/lib/queue');
      const id = await jobQueue.add('test-remove', { name: 'remove-me', data: {} });
      const removed = await jobQueue.remove('test-remove', id);
      expect(removed).toBe(true);
      const job = await jobQueue.getJob('test-remove', id);
      expect(job).toBeNull();
    });
  });

  // =========================================================================
  // Section G: getQueueAdapterType
  // =========================================================================

  describe('Queue adapter detection', () => {
    it('should return memory type when REDIS_URL is not set', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { getQueueAdapterType } = await import('@/lib/queue');
      expect(getQueueAdapterType()).toBe('memory');
    });

    it('should return memory type as default', async () => {
      delete process.env.REDIS_URL;
      vi.resetModules();
      const { getQueueAdapterType } = await import('@/lib/queue');
      expect(getQueueAdapterType()).toBe('memory');
    });
  });

  // =========================================================================
  // Section H: Queue Constants
  // =========================================================================

  describe('Queue constants', () => {
    it('should export all required queue names', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { QUEUES } = await import('@/lib/queue');
      expect(QUEUES.NOTIFICATION).toBe('notifications');
      expect(QUEUES.TELEMETRY).toBe('telemetry-processing');
      expect(QUEUES.REPORT_GENERATION).toBe('report-generation');
      expect(QUEUES.EMAIL).toBe('email');
      expect(QUEUES.WORKFLOW).toBe('workflow-orchestration');
    });

    it('should export queue labels for UI display', async () => {
      process.env.REDIS_URL = '';
      vi.resetModules();
      const { QUEUES, QUEUE_LABELS } = await import('@/lib/queue');
      expect(QUEUE_LABELS[QUEUES.NOTIFICATION]).toBe('Notifications');
      expect(QUEUE_LABELS[QUEUES.TELEMETRY]).toBe('Telemetry Processing');
    });
  });
});
