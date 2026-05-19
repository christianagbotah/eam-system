// ============================================================================
// Industrial Connectivity — Integration Wire-up Tests
// Tests: adapter registry, telemetry batcher behavior, edge gateway heartbeat,
//        event stream processor event filtering, module exports
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock the logger ----
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    timer: () => ({ end: () => 0 }),
  }),
}));

// ---- Mock the database ----
vi.mock('@/lib/db', () => ({
  db: {
    telemetryStream: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    telemetryBatch: {
      create: vi.fn().mockResolvedValue({}),
    },
    edgeGateway: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'gw-1', gatewayCode: 'GW-001', status: 'offline',
        bufferSize: 1000, syncIntervalMs: 5000, batchSize: 100,
      }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'gw-1' }),
    },
    eventStreamRecord: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    telemetryDataSource: { count: vi.fn().mockResolvedValue(0) },
    connectivitySession: { count: vi.fn().mockResolvedValue(0) },
  },
}));

describe('Industrial Connectivity — Integration Wire-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Section A: Connectivity Module Exports
  // =========================================================================

  describe('Connectivity module exports', () => {
    it('should export MQTTAdapter class', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.MQTTAdapter).toBeDefined();
      expect(typeof mod.MQTTAdapter).toBe('function');
    });

    it('should export OPCUAAdapter class', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.OPCUAAdapter).toBeDefined();
      expect(typeof mod.OPCUAAdapter).toBe('function');
    });

    it('should export ModbusAdapter class', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.ModbusAdapter).toBeDefined();
      expect(typeof mod.ModbusAdapter).toBe('function');
    });

    it('should export edgeGatewayService singleton', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.edgeGatewayService).toBeDefined();
      expect(mod.EdgeGatewayService).toBeDefined();
    });

    it('should export telemetryBatcher singleton', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.telemetryBatcher).toBeDefined();
      expect(mod.TelemetryBatcher).toBeDefined();
    });

    it('should export eventStreamProcessor singleton', async () => {
      const mod = await import('@/services/connectivity/index');
      expect(mod.eventStreamProcessor).toBeDefined();
      expect(mod.EventStreamProcessor).toBeDefined();
    });
  });

  // =========================================================================
  // Section B: Telemetry Batcher Behavior
  // =========================================================================

  describe('TelemetryBatcher', () => {
    it('should create batcher with default config', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher();
      const stats = batcher.getStats();
      expect(stats.activeBatches).toBe(0);
      expect(stats.pendingReadings).toBe(0);
      expect(stats.totalBatchesFlushed).toBe(0);
      expect(stats.totalReadingsProcessed).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.config.maxBatchSize).toBe(500);
      expect(stats.config.flushIntervalMs).toBe(3000);
    });

    it('should accept custom batch config', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher({
        maxBatchSize: 10,
        flushIntervalMs: 1000,
        retryOnFail: false,
        maxRetries: 1,
      });
      const stats = batcher.getStats();
      expect(stats.config.maxBatchSize).toBe(10);
      expect(stats.config.flushIntervalMs).toBe(1000);
      expect(stats.config.retryOnFail).toBe(false);
      expect(stats.config.maxRetries).toBe(1);
    });

    it('should accumulate readings per source', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher({ maxBatchSize: 100 });

      batcher.add('src-1', {
        mappingId: 'map-1',
        value: 42.5,
        quality: 100,
        timestamp: new Date(),
      });
      batcher.add('src-1', {
        mappingId: 'map-1',
        value: 43.0,
        quality: 100,
        timestamp: new Date(),
      });

      const stats = batcher.getStats();
      expect(stats.activeBatches).toBe(1);
      expect(stats.pendingReadings).toBe(2);
      expect(stats.totalReadingsProcessed).toBe(2);
    });

    it('should track separate batches per source', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher({ maxBatchSize: 100 });

      batcher.add('src-1', { mappingId: 'map-1', value: 1, quality: 100, timestamp: new Date() });
      batcher.add('src-2', { mappingId: 'map-2', value: 2, quality: 100, timestamp: new Date() });
      batcher.add('src-1', { mappingId: 'map-1', value: 3, quality: 100, timestamp: new Date() });

      const stats = batcher.getStats();
      expect(stats.activeBatches).toBe(2);
      expect(stats.pendingReadings).toBe(3);
    });

    it('should emit batch_flushed event on successful flush', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher({ maxBatchSize: 100 });

      const flushSpy = vi.fn();
      batcher.on('batch_flushed', flushSpy);

      batcher.add('src-1', { mappingId: 'map-1', value: 1, quality: 100, timestamp: new Date() });
      await batcher.flushSource('src-1');

      expect(flushSpy).toHaveBeenCalledTimes(1);
      expect(flushSpy.mock.calls[0][0].sourceId).toBe('src-1');
      expect(flushSpy.mock.calls[0][0].count).toBe(1);
    });

    it('should return empty result when flushing non-existent source', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher();

      const result = await batcher.flushSource('non-existent');
      expect(result.flushed).toBe(0);
      expect(result.error).toBeNull();
    });

    it('should start and stop the timer-based flush', async () => {
      vi.resetModules();
      const { TelemetryBatcher } = await import('@/services/connectivity/telemetryBatcher');
      const batcher = new TelemetryBatcher({ flushIntervalMs: 1000 });

      batcher.start();
      // The start method sets an interval timer
      batcher.stop();
      // No errors should be thrown
    });
  });

  // =========================================================================
  // Section C: Event Stream Processor
  // =========================================================================

  describe('EventStreamProcessor', () => {
    it('should create processor with empty state', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();
      const stats = proc.getStats();
      expect(stats.bufferLength).toBe(0);
      expect(stats.processingCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.registeredHandlers).toEqual([]);
    });

    it('should register event handler and route events', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const handler = vi.fn();
      proc.onEvent('data_ingested', handler);

      await proc.processEvent({
        eventType: 'data_ingested',
        sourceType: 'mqtt',
        sourceId: 'src-1',
        severity: 'info',
        payload: { value: 42 },
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].eventType).toBe('data_ingested');
      expect(handler.mock.calls[0][0].payload.value).toBe(42);
    });

    it('should route events to wildcard handlers', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const wildcardHandler = vi.fn();
      proc.onEvent('*', wildcardHandler);

      await proc.processEvent({
        eventType: 'alarm_triggered',
        severity: 'critical',
        payload: {},
      });

      await proc.processEvent({
        eventType: 'connection_changed',
        severity: 'info',
        payload: {},
      });

      expect(wildcardHandler).toHaveBeenCalledTimes(2);
    });

    it('should support registering handlers for multiple event types', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const handler = vi.fn();
      proc.onEvent(['data_ingested', 'alarm_triggered', 'anomaly_detected'], handler);

      await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: {} });
      await proc.processEvent({ eventType: 'alarm_triggered', severity: 'warning', payload: {} });
      await proc.processEvent({ eventType: 'connection_changed', severity: 'info', payload: {} }); // not registered

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should unregister handlers with offEvent', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const handler = vi.fn();
      proc.onEvent('data_ingested', handler);
      await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: {} });
      expect(handler).toHaveBeenCalledTimes(1);

      proc.offEvent('data_ingested', handler);
      await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: {} });
      expect(handler).toHaveBeenCalledTimes(1); // no new calls
    });

    it('should isolate handler errors — other handlers still run', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const failHandler = vi.fn().mockRejectedValue(new Error('boom'));
      const okHandler = vi.fn();
      proc.onEvent('data_ingested', failHandler);
      proc.onEvent('data_ingested', okHandler);

      await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: {} });

      expect(failHandler).toHaveBeenCalled();
      expect(okHandler).toHaveBeenCalledTimes(1);
    });

    it('should increment processing count and track errors', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      proc.onEvent('data_ingested', vi.fn().mockRejectedValue(new Error('fail')));

      await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: {} });
      const stats = proc.getStats();
      expect(stats.processingCount).toBe(1);
      expect(stats.errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should provide convenience emit methods', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      const spy = vi.fn();
      proc.onEvent('*', spy);

      // Convenience methods should process events through the pipeline
      proc.emitDataIngested('mqtt', 'src-1', 'map-1', 42.5);
      proc.emitAlarmTriggered('alarm-1', 'map-1', 'HighTemp', 'critical', 95, 85);
      proc.emitAnomalyDetected('map-1', 100, 85.5);
      proc.emitConnectionChanged('gw-1', 'mqtt', 'connected');
      proc.emitBatchProcessed('src-1', 500, 120);

      expect(spy).toHaveBeenCalledTimes(5);
    });

    it('should buffer events and trim at max buffer size', async () => {
      vi.resetModules();
      const { EventStreamProcessor } = await import('@/services/connectivity/eventStreamProcessor');
      const proc = new EventStreamProcessor();

      for (let i = 0; i < 10500; i++) {
        await proc.processEvent({ eventType: 'data_ingested', severity: 'info', payload: { i } });
      }

      // Buffer should be trimmed to 10000
      const stats = proc.getStats();
      expect(stats.bufferLength).toBeLessThanOrEqual(10000);
    });
  });

  // =========================================================================
  // Section D: Edge Gateway Heartbeat Processing
  // =========================================================================

  describe('EdgeGatewayService', () => {
    it('should process heartbeat and update gateway status', async () => {
      vi.resetModules();
      const { EdgeGatewayService } = await import('@/services/connectivity/edgeGateway');
      const service = new EdgeGatewayService();

      const heartbeatSpy = vi.fn();
      service.on('heartbeat', heartbeatSpy);

      await service.processHeartbeat('gw-1', {
        bufferedCount: 50,
        batteryLevel: 85,
        signalStrength: -60,
      });

      expect(heartbeatSpy).toHaveBeenCalledTimes(1);
      const emitted = heartbeatSpy.mock.calls[0][0];
      expect(emitted.gatewayId).toBe('gw-1');
      expect(emitted.bufferedCount).toBe(50);
      expect(emitted.batteryLevel).toBe(85);
      expect(emitted.signalStrength).toBe(-60);
    });

    it('should throw when processing heartbeat for non-existent gateway', async () => {
      vi.resetModules();
      const { EdgeGatewayService } = await import('@/services/connectivity/edgeGateway');
      const service = new EdgeGatewayService();

      // Mock findUnique to return null
      const { db } = await import('@/lib/db');
      vi.mocked(db.edgeGateway.findUnique).mockResolvedValueOnce(null as never);

      await expect(
        service.processHeartbeat('non-existent', {}),
      ).rejects.toThrow('Gateway non-existent not found');
    });

    it('should return buffer status for unknown gateway as empty', async () => {
      vi.resetModules();
      const { EdgeGatewayService } = await import('@/services/connectivity/edgeGateway');
      const service = new EdgeGatewayService();

      const status = service.getBufferStatus('unknown-gw');
      expect(status.count).toBe(0);
      expect(status.capacity).toBe(0);
      expect(status.utilizationPct).toBe(0);
    });
  });
});
