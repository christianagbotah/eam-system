import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('queue adapter production selection', () => {
  afterEach(() => {
    delete process.env.REDIS_URL;
    vi.resetModules();
  });

  it('uses the memory adapter only when REDIS_URL is absent', async () => {
    delete process.env.REDIS_URL;
    vi.resetModules();

    const { getQueueAdapterType } = await import('@/lib/queue');

    expect(getQueueAdapterType()).toBe('memory');
  });

  it('selects BullMQ immediately when REDIS_URL is configured', async () => {
    process.env.REDIS_URL = 'redis://queue-user:queue-pass@redis.internal:6380/2';
    vi.resetModules();

    const { getQueueAdapterType } = await import('@/lib/queue');

    // Adapter selection must not depend on a one-time Redis ready/isAvailable
    // probe. BullMQ/ioredis owns connection establishment and retry behavior.
    expect(getQueueAdapterType()).toBe('bullmq');
  });

  it('parses authenticated Redis URLs into BullMQ/ioredis options', async () => {
    vi.resetModules();
    const { getBullMQConnectionOptions } = await import('@/lib/queue');

    expect(
      getBullMQConnectionOptions('redis://queue-user:queue%20pass@redis.internal:6380/3'),
    ).toEqual({
      host: 'redis.internal',
      port: 6380,
      username: 'queue-user',
      password: 'queue pass',
      db: 3,
      maxRetriesPerRequest: null,
    });
  });

  it('enables TLS for rediss URLs', async () => {
    vi.resetModules();
    const { getBullMQConnectionOptions } = await import('@/lib/queue');

    expect(getBullMQConnectionOptions('rediss://cache.example.com:6379/0')).toEqual({
      host: 'cache.example.com',
      port: 6379,
      tls: {},
      maxRetriesPerRequest: null,
    });
  });

  it('rejects unsupported Redis URL protocols', async () => {
    vi.resetModules();
    const { getBullMQConnectionOptions } = await import('@/lib/queue');

    expect(() => getBullMQConnectionOptions('http://cache.example.com')).toThrow(
      'Unsupported Redis protocol',
    );
  });

  it('rejects invalid Redis database indexes', async () => {
    vi.resetModules();
    const { getBullMQConnectionOptions } = await import('@/lib/queue');

    expect(() => getBullMQConnectionOptions('redis://cache.example.com/not-a-db')).toThrow(
      'invalid database index',
    );
  });
});
