// ============================================================================
// MQTT Protocol Adapter — Integration Test Scaffolding
// Tests: connection config, deduplication, offline buffering, device tracking,
//        batching logic, broker failover, statistics
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock the logger before importing the adapter ----
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    timer: () => ({ end: () => 0 }),
  }),
}));

// Helper to get a fresh adapter instance
async function createFreshAdapter(config?: Partial<import('@/services/connectivity/mqttAdapter').MQTTConnectionConfig>) {
  vi.resetModules();
  const { MQTTAdapter } = await import('@/services/connectivity/mqttAdapter');
  return new MQTTAdapter({
    broker: 'mqtt-broker.local',
    port: 1883,
    clientId: 'test-client-001',
    ...config,
  });
}

describe('MQTTAdapter', () => {
  let adapter: Awaited<ReturnType<typeof createFreshAdapter>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    adapter = await createFreshAdapter({
      dedupTtlMs: 60_000,
      offlineBufferMaxSize: 100,
      batchFlushIntervalMs: 5000,
      batchMaxSize: 10,
      deviceTimeoutMs: 300_000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1: Constructor initializes config correctly
  // -------------------------------------------------------------------------
  it('should initialize with correct default config values', () => {
    const status = adapter.getStatus();
    expect(status.connected).toBe(false);
    expect(status.connecting).toBe(false);
    expect(status.clientId).toBe('test-client-001');
    expect(status.subscriptions).toEqual([]);
    expect(status.totalBrokers).toBe(1);
    expect(status.offlineBufferSize).toBe(0);
    expect(status.trackedDevices).toBe(0);
    expect(status.dedupCacheSize).toBe(0);
    expect(status.batchSize).toBe(0);
    expect(status.totalBatchesFlushed).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 2: Connection config parsing — URL format with username/password
  // -------------------------------------------------------------------------
  it('should accept connection config with username and password', async () => {
    const secureAdapter = await createFreshAdapter({
      broker: 'secure-broker.local',
      port: 8883,
      clientId: 'secure-client',
      username: 'admin',
      password: 'secret123',
      protocol: 'mqtts',
    });
    const status = secureAdapter.getStatus();
    expect(status.clientId).toBe('secure-client');
    expect(status.broker).toContain('secure-broker.local');
  });

  // -------------------------------------------------------------------------
  // Test 3: Connection config with failover brokers
  // -------------------------------------------------------------------------
  it('should register failover brokers in broker health map', async () => {
    const multiAdapter = await createFreshAdapter({
      failoverBrokers: [
        { broker: 'backup1.local', port: 1883 },
        { broker: 'backup2.local', port: 1883, protocol: 'mqtts' },
      ],
    });
    const status = multiAdapter.getStatus();
    expect(status.totalBrokers).toBe(3); // primary + 2 failover
    expect(status.brokerHealth.length).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Test 4: Successful connection (using fake timers)
  // -------------------------------------------------------------------------
  it('should connect successfully and emit connected event', async () => {
    const connectedSpy = vi.fn();
    const statusSpy = vi.fn();
    adapter.on('connected', connectedSpy);
    adapter.on('status_change', statusSpy);

    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    expect(connectedSpy).toHaveBeenCalledTimes(1);
    expect(statusSpy).toHaveBeenCalledWith({ status: 'connected', brokerIndex: 0 });
    expect(adapter.getStatus().connected).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 5: Disconnect cleans up state
  // -------------------------------------------------------------------------
  it('should disconnect and clear subscriptions', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'test/topic', qos: 1, mappingId: 'map-1' });
    expect(adapter.getStatus().subscriptions.length).toBe(1);

    await adapter.disconnect();
    expect(adapter.getStatus().connected).toBe(false);
    expect(adapter.getStatus().subscriptions.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 6: Message deduplication — duplicate messages are dropped
  // -------------------------------------------------------------------------
  it('should deduplicate identical messages within TTL', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'sensor/temp', qos: 1, mappingId: 'map-1' });

    const dataSpy = vi.fn();
    adapter.on('data', dataSpy);

    const msg = { topic: 'sensor/temp', payload: Buffer.from('{"temp":25}'), qos: 1, retain: false };
    adapter.handleIncomingMessage(msg);
    adapter.handleIncomingMessage(msg);

    expect(dataSpy).toHaveBeenCalledTimes(1);
    expect(adapter.getStatus().droppedCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Test 7: Deduplication allows different messages
  // -------------------------------------------------------------------------
  it('should allow different messages through deduplication', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'sensor/temp', qos: 1, mappingId: 'map-1' });

    const dataSpy = vi.fn();
    adapter.on('data', dataSpy);

    adapter.handleIncomingMessage({ topic: 'sensor/temp', payload: Buffer.from('{"temp":25}'), qos: 1, retain: false });
    adapter.handleIncomingMessage({ topic: 'sensor/temp', payload: Buffer.from('{"temp":26}'), qos: 1, retain: false });

    expect(dataSpy).toHaveBeenCalledTimes(2);
    expect(adapter.getStatus().droppedCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 8: Offline buffering — messages queued when disconnected
  // -------------------------------------------------------------------------
  it('should buffer messages when not connected', () => {
    expect(adapter.getStatus().connected).toBe(false);

    adapter.publish('offline/topic', 'buffered message', 1);

    const status = adapter.getStatus();
    expect(status.offlineBufferSize).toBe(1);
    expect(status.messageCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 9: Offline buffer discards oldest when full
  // -------------------------------------------------------------------------
  it('should discard oldest messages when offline buffer is full', async () => {
    const tinyAdapter = await createFreshAdapter({ offlineBufferMaxSize: 3 });

    tinyAdapter.publish('t/1', 'msg1');
    tinyAdapter.publish('t/2', 'msg2');
    tinyAdapter.publish('t/3', 'msg3');
    tinyAdapter.publish('t/4', 'msg4'); // Should evict oldest

    expect(tinyAdapter.getStatus().offlineBufferSize).toBe(3);
    expect(tinyAdapter.getStatus().droppedCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Test 10: Device tracking registers new devices
  // -------------------------------------------------------------------------
  it('should track devices on incoming messages', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'device/pump-01/data', qos: 0, mappingId: 'map-1' });
    adapter.handleIncomingMessage({
      topic: 'device/pump-01/data',
      payload: Buffer.from('{"rpm":1200}'),
      qos: 0,
      retain: false,
    });

    const devices = adapter.getDeviceStatuses();
    expect(devices.length).toBe(1);
    expect(devices[0].topic).toBe('device/pump-01/data');
    expect(devices[0].messageCount).toBe(1);
    expect(devices[0].isOnline).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 11: Device tracking increments message count for known devices
  // -------------------------------------------------------------------------
  it('should increment message count for existing devices', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'device/pump-01/data', qos: 0, mappingId: 'map-1' });

    adapter.handleIncomingMessage({ topic: 'device/pump-01/data', payload: Buffer.from('{"rpm":1200}'), qos: 0, retain: false });
    adapter.handleIncomingMessage({ topic: 'device/pump-01/data', payload: Buffer.from('{"rpm":1205}'), qos: 0, retain: false });
    adapter.handleIncomingMessage({ topic: 'device/pump-01/data', payload: Buffer.from('{"rpm":1198}'), qos: 0, retain: false });

    const devices = adapter.getDeviceStatuses();
    expect(devices.length).toBe(1);
    expect(devices[0].messageCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Test 12: Batching — accumulates messages and flushes on max size
  // -------------------------------------------------------------------------
  it('should accumulate messages in batch and flush at max size', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'sensor/data', qos: 0, mappingId: 'map-1' });

    const batchSpy = vi.fn();
    adapter.on('batch', batchSpy);

    for (let i = 0; i < 10; i++) {
      adapter.handleIncomingMessage({
        topic: 'sensor/data',
        payload: Buffer.from(`{"value":${i}}`),
        qos: 0,
        retain: false,
      });
    }

    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy.mock.calls[0][0].count).toBe(10);
    expect(adapter.getStatus().totalBatchesFlushed).toBe(1);
    expect(adapter.getStatus().batchSize).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 13: Batching — partial batch not auto-flushed
  // -------------------------------------------------------------------------
  it('should not auto-flush a partial batch below max size', async () => {
    const connectPromise = adapter.connect();
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    adapter.subscribe({ topic: 'sensor/data', qos: 0, mappingId: 'map-1' });

    const batchSpy = vi.fn();
    adapter.on('batch', batchSpy);

    for (let i = 0; i < 5; i++) {
      adapter.handleIncomingMessage({
        topic: 'sensor/data',
        payload: Buffer.from(`{"value":${i}}`),
        qos: 0,
        retain: false,
      });
    }

    expect(batchSpy).not.toHaveBeenCalled();
    expect(adapter.getStatus().batchSize).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Test 14: Broker health ranking
  // -------------------------------------------------------------------------
  it('should rank brokers by health score', async () => {
    const multiAdapter = await createFreshAdapter({
      failoverBrokers: [
        { broker: 'backup1.local', port: 1883 },
        { broker: 'backup2.local', port: 1883 },
      ],
    });
    const ranking = multiAdapter.getBrokerHealthRanking();
    expect(ranking.length).toBe(3);
    expect(ranking[0].healthScore).toBe(100);
  });

  // -------------------------------------------------------------------------
  // Test 15: Best broker selection
  // -------------------------------------------------------------------------
  it('should return the best broker by health score', async () => {
    const multiAdapter = await createFreshAdapter({
      failoverBrokers: [{ broker: 'backup1.local', port: 1883 }],
    });
    const best = multiAdapter.getBestBroker();
    expect(best).not.toBeNull();
    expect(best!.index).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // Test 16: Switch broker
  // -------------------------------------------------------------------------
  it('should switch to a different broker by index', async () => {
    const multiAdapter = await createFreshAdapter({
      failoverBrokers: [{ broker: 'backup1.local', port: 1883 }],
    });

    multiAdapter.switchBroker(1);
    const status = multiAdapter.getStatus();
    expect(status.currentBrokerIndex).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Test 17: Switch broker with invalid index throws
  // -------------------------------------------------------------------------
  it('should throw when switching to invalid broker index', async () => {
    const multiAdapter = await createFreshAdapter({
      failoverBrokers: [{ broker: 'backup1.local', port: 1883 }],
    });

    expect(() => multiAdapter.switchBroker(99)).toThrow('Invalid broker index');
  });

  // -------------------------------------------------------------------------
  // Test 18: Statistics reset
  // -------------------------------------------------------------------------
  it('should reset all statistics counters', async () => {
    adapter.resetStats();
    const status = adapter.getStatus();
    expect(status.messageCount).toBe(0);
    expect(status.errorCount).toBe(0);
    expect(status.droppedCount).toBe(0);
    expect(status.bytesReceived).toBe(0);
    expect(status.bytesSent).toBe(0);
    expect(status.totalBatchesFlushed).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 19: Subscribe requires connection
  // -------------------------------------------------------------------------
  it('should throw when subscribing while not connected', () => {
    expect(() => {
      adapter.subscribe({ topic: 'test/topic', qos: 1, mappingId: 'map-1' });
    }).toThrow('MQTT not connected');
  });

  // -------------------------------------------------------------------------
  // Test 20: Update config at runtime
  // -------------------------------------------------------------------------
  it('should update config at runtime including failover brokers', async () => {
    adapter.updateConfig({
      keepalive: 120,
      failoverBrokers: [{ broker: 'new-backup.local', port: 1883 }],
    });

    const status = adapter.getStatus();
    expect(status.totalBrokers).toBe(2);
    expect(status.brokerHealth.length).toBe(2);
  });
});
