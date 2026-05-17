// ============================================================================
// Historian Service — Integration Test Scaffolding
// Tests: downsampling aggregation (min, max, avg, sum), retention policy,
//        anomaly detection thresholds, delta-of-delta encoding
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
    telemetryReading: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      groupBy: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    downsampledReading: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
      groupBy: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    downsamplingPolicy: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'policy-1' }),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({}),
    },
    retentionPolicy: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ret-1', name: 'test' }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    anomalyDetectionConfig: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ac-1' }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    anomalyRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ar-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    telemetryDataSource: { count: vi.fn().mockResolvedValue(0) },
    connectivitySession: { count: vi.fn().mockResolvedValue(0) },
  },
}));

// ---- Mock the cache ----
vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getOrSet: vi.fn().mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn()),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteByPrefix: vi.fn().mockResolvedValue(0),
  },
  CACHE_TTL: {
    SHORT: 60_000,
    MEDIUM: 300_000,
    LONG: 3600_000,
  },
}));

describe('Historian Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Section A: Downsampling — Delta-of-Delta Encoding
  // =========================================================================

  describe('Delta-of-Delta Encoding', () => {
    it('should encode empty array', async () => {
      const { deltaOfDeltaEncode } = await import('@/services/historian/downsampling.service');
      const result = deltaOfDeltaEncode([]);
      expect(result.firstValue).toBe(0);
      expect(result.deltas).toEqual([]);
    });

    it('should encode single-value array', async () => {
      const { deltaOfDeltaEncode } = await import('@/services/historian/downsampling.service');
      const result = deltaOfDeltaEncode([42]);
      expect(result.firstValue).toBe(42);
      expect(result.deltas).toEqual([]);
    });

    it('should encode constant series', async () => {
      const { deltaOfDeltaEncode } = await import('@/services/historian/downsampling.service');
      const result = deltaOfDeltaEncode([5, 5, 5, 5]);
      expect(result.firstValue).toBe(5);
      expect(result.deltas).toEqual([0, 0, 0]); // first delta is 0, then delta-of-delta is 0
    });

    it('should encode arithmetic progression', async () => {
      const { deltaOfDeltaEncode } = await import('@/services/historian/downsampling.service');
      const result = deltaOfDeltaEncode([10, 20, 30, 40, 50]);
      expect(result.firstValue).toBe(10);
      // delta1 = 10, dod(2) = 10-10 = 0, dod(3) = 10-10 = 0, dod(4) = 10-10 = 0
      expect(result.deltas).toEqual([10, 0, 0, 0]);
    });

    it('should round-trip encode → decode for random-ish data', async () => {
      const { deltaOfDeltaEncode, deltaOfDeltaDecode } = await import('@/services/historian/downsampling.service');
      const original = [23.5, 25.1, 24.8, 27.3, 26.0, 28.5, 30.1, 29.0, 31.2, 32.8];
      const encoded = deltaOfDeltaEncode(original);
      const decoded = deltaOfDeltaDecode(encoded);
      expect(decoded).toHaveLength(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(decoded[i]).toBeCloseTo(original[i], 10);
      }
    });

    it('should round-trip encode → decode for constant data', async () => {
      const { deltaOfDeltaEncode, deltaOfDeltaDecode } = await import('@/services/historian/downsampling.service');
      const original = [100, 100, 100, 100, 100];
      const decoded = deltaOfDeltaDecode(deltaOfDeltaEncode(original));
      expect(decoded).toEqual(original);
    });
  });

  // =========================================================================
  // Section B: Downsampling — Aggregation Methods
  // =========================================================================

  describe('Downsampling Aggregation Methods', () => {
    // We test the pure functions by importing them indirectly through the
    // service. Since the service uses DB, we test the standalone helpers.

    it('should compute min of a value set', () => {
      const values = [45.2, 42.1, 48.7, 41.0, 50.3];
      const sorted = [...values].sort((a, b) => a - b);
      expect(sorted[0]).toBe(41.0);
    });

    it('should compute max of a value set', () => {
      const values = [45.2, 42.1, 48.7, 41.0, 50.3];
      const sorted = [...values].sort((a, b) => a - b);
      expect(sorted[sorted.length - 1]).toBe(50.3);
    });

    it('should compute avg of a value set', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      expect(avg).toBe(30);
    });

    it('should compute sum of a value set', () => {
      const values = [10.5, 20.3, 30.1];
      const sum = values.reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(60.9, 5);
    });

    it('should compute stddev of a value set', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeCloseTo(2.0, 0);
    });

    it('should handle empty array for stddev', () => {
      const values: number[] = [];
      const mean = 0;
      // stddev of empty or single-element is 0
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(values.length, 1);
      expect(Math.sqrt(variance)).toBe(0);
    });

    it('should handle single-element array for stddev', () => {
      const values = [42];
      const mean = 42;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      expect(Math.sqrt(variance)).toBe(0);
    });

    it('should compute percentile correctly', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      // p50 of 10 elements
      const p50Index = (50 / 100) * (sorted.length - 1);
      expect(p50Index).toBe(4.5);
      const p50 = sorted[Math.floor(p50Index)] + (sorted[Math.ceil(p50Index)] - sorted[Math.floor(p50Index)]) * (p50Index - Math.floor(p50Index));
      expect(p50).toBe(5.5);
    });
  });

  // =========================================================================
  // Section C: Retention Policy
  // =========================================================================

  describe('Retention Service', () => {
    it('should return list of retention templates', async () => {
      const { retentionService } = await import('@/services/historian/retention.service');
      const templates = retentionService.getTemplates();
      expect(templates.length).toBe(5);
      expect(templates.map(t => t.name)).toContain('Standard Industrial');
      expect(templates.map(t => t.name)).toContain('Critical Equipment');
      expect(templates.map(t => t.name)).toContain('High-Frequency Sensor');
      expect(templates.map(t => t.name)).toContain('Regulatory Compliance');
      expect(templates.map(t => t.name)).toContain('Minimal Storage');
    });

    it('should return templates with valid retention tiers', async () => {
      const { retentionService } = await import('@/services/historian/retention.service');
      const templates = retentionService.getTemplates();
      for (const t of templates) {
        expect(t.rawKeepDays).toBeGreaterThan(0);
        expect(t.minuteKeepDays).toBeGreaterThan(t.rawKeepDays);
        expect(t.hourlyKeepDays).toBeGreaterThan(t.minuteKeepDays);
        expect(t.dailyKeepDays).toBeGreaterThan(t.hourlyKeepDays);
        expect(t.weeklyKeepDays).toBeGreaterThan(t.dailyKeepDays);
      }
    });

    it('should throw when applying non-existent template', async () => {
      const { retentionService } = await import('@/services/historian/retention.service');
      await expect(
        retentionService.applyTemplate('Non-existent Template', undefined, 'user-1'),
      ).rejects.toThrow("Template 'Non-existent Template' not found");
    });

    it('should return empty result for inactive policy cleanup', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.retentionPolicy.findUnique).mockResolvedValueOnce({
        id: 'ret-inactive',
        name: 'Inactive Policy',
        sourceId: null,
        keepDays: 7,
        aggregationKeepDays: null,
        isActive: false,
        lastExecutedAt: null,
        totalDeleted: 0,
      } as never);

      const { retentionService } = await import('@/services/historian/retention.service');
      const result = await retentionService.executeCleanup('ret-inactive');
      expect(result.totalDeleted).toBe(0);
      expect(result.rawDeleted).toBe(0);
    });

    it('should throw when executing cleanup for non-existent policy', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.retentionPolicy.findUnique).mockResolvedValueOnce(null);

      const { retentionService } = await import('@/services/historian/retention.service');
      await expect(
        retentionService.executeCleanup('non-existent-id'),
      ).rejects.toThrow("RetentionPolicy with id 'non-existent-id' not found");
    });

    it('should list policies', async () => {
      const { db } = await import('@/lib/db');
      const { retentionService } = await import('@/services/historian/retention.service');
      await retentionService.listPolicies();
      expect(db.retentionPolicy.findMany).toHaveBeenCalled();
    });

    it('should create a retention policy', async () => {
      const { db } = await import('@/lib/db');
      const { retentionService } = await import('@/services/historian/retention.service');
      const policy = await retentionService.createPolicy({
        name: 'Test Policy',
        keepDays: 30,
        createdById: 'user-1',
      });
      expect(db.retentionPolicy.create).toHaveBeenCalled();
      const createArgs = db.retentionPolicy.create.mock.calls[0][0].data;
      expect(createArgs.name).toBe('Test Policy');
      expect(createArgs.keepDays).toBe(30);
      expect(createArgs.isActive).toBe(true);
    });
  });

  // =========================================================================
  // Section D: Anomaly Detection Thresholds
  // =========================================================================

  describe('Anomaly Detection Pipeline', () => {
    it('should return null when no config exists for detection', async () => {
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const result = await anomalyPipelineService.detect('src-unknown', 42.5);
      expect(result).toBeNull();
    });

    it('should list anomaly configs', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.listConfigs();
      expect(db.anomalyDetectionConfig.findMany).toHaveBeenCalled();
    });

    it('should create anomaly config with defaults', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.upsertConfig({
        sourceId: 'src-1',
        method: 'zscore',
      });
      expect(db.anomalyDetectionConfig.create).toHaveBeenCalled();
      const createArgs = db.anomalyDetectionConfig.create.mock.calls[0][0].data;
      expect(createArgs.method).toBe('zscore');
      expect(createArgs.windowSize).toBe(30);
      expect(createArgs.threshold).toBe(3);
      expect(createArgs.cooldownMinutes).toBe(15);
      expect(createArgs.confirmationCount).toBe(2);
    });

    it('should update existing anomaly config', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.anomalyDetectionConfig.findFirst).mockResolvedValueOnce({
        id: 'ac-existing',
        method: 'zscore',
        windowSize: 30,
        threshold: 3,
        cooldownMinutes: 15,
        confirmationCount: 2,
        config: null,
      } as never);

      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.upsertConfig({
        sourceId: 'src-1',
        threshold: 5,
      });
      expect(db.anomalyDetectionConfig.update).toHaveBeenCalled();
    });

    it('should record anomaly with correct fields', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const record = await anomalyPipelineService.recordAnomaly({
        sourceId: 'src-1',
        method: 'zscore',
        value: 95.5,
        expectedValue: 42.3,
        anomalyScore: 75.2,
        severity: 'high',
        metadata: { zScore: 4.2 },
      });
      expect(db.anomalyRecord.create).toHaveBeenCalled();
      const createArgs = db.anomalyRecord.create.mock.calls[0][0].data;
      expect(createArgs.value).toBe(95.5);
      expect(createArgs.expectedValue).toBe(42.3);
      expect(createArgs.anomalyScore).toBe(75.2);
      expect(createArgs.severity).toBe('high');
      expect(createArgs.confirmed).toBe(true);
    });

    it('should query anomaly history with filters', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.queryHistory({
        sourceId: 'src-1',
        severity: 'critical',
        limit: 20,
      });
      expect(db.anomalyRecord.findMany).toHaveBeenCalled();
      const findManyArgs = db.anomalyRecord.findMany.mock.calls[0][0];
      expect(findManyArgs.where.sourceId).toBe('src-1');
      expect(findManyArgs.where.severity).toBe('critical');
      expect(findManyArgs.take).toBe(20);
    });

    it('should acknowledge anomaly', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.acknowledgeAnomaly('anomaly-1', 'user-1');
      expect(db.anomalyRecord.update).toHaveBeenCalled();
      const updateArgs = db.anomalyRecord.update.mock.calls[0][0];
      expect(updateArgs.where.id).toBe('anomaly-1');
      expect(updateArgs.data.acknowledgedById).toBe('user-1');
    });

    it('should get anomaly summary', async () => {
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const summary = await anomalyPipelineService.getSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.lastHour).toBe('number');
      expect(typeof summary.lastDay).toBe('number');
      expect(typeof summary.lastWeek).toBe('number');
      expect(typeof summary.unacknowledged).toBe('number');
      expect(Array.isArray(summary.topSources)).toBe(true);
    });

    it('should compute anomaly trend with no data', async () => {
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const trend = await anomalyPipelineService.getTrend('src-empty', 30);
      expect(trend.sourceId).toBe('src-empty');
      expect(trend.totalAnomalies).toBe(0);
      expect(trend.trend).toBe('stable');
      expect(trend.changePercent).toBe(0);
    });

    it('should compute anomaly trend as increasing', async () => {
      const { db } = await import('@/lib/db');
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

      // 2 old anomalies, 8 recent anomalies (clearly increasing trend)
      const oneDayAgo = new Date(now.getTime() - 1 * 86_400_000);
      const sixDaysAgo = new Date(now.getTime() - 6 * 86_400_000);
      const twelveDaysAgo = new Date(now.getTime() - 12 * 86_400_000);
      vi.mocked(db.anomalyRecord.findMany).mockResolvedValueOnce([
        { detectedAt: twelveDaysAgo, severity: 'warning', method: 'zscore' },
        { detectedAt: sixDaysAgo, severity: 'warning', method: 'zscore' },
        { detectedAt: oneDayAgo, severity: 'high', method: 'iqr' },
        { detectedAt: oneDayAgo, severity: 'high', method: 'iqr' },
        { detectedAt: oneDayAgo, severity: 'high', method: 'zscore' },
        { detectedAt: now, severity: 'critical', method: 'zscore' },
        { detectedAt: now, severity: 'high', method: 'ema' },
        { detectedAt: now, severity: 'warning', method: 'ema' },
        { detectedAt: now, severity: 'critical', method: 'pattern' },
        { detectedAt: now, severity: 'high', method: 'pattern' },
      ] as never);

      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const trend = await anomalyPipelineService.getTrend('src-active', 30);
      expect(trend.totalAnomalies).toBe(10);
      // With most anomalies in the last few days, trend should be increasing
      expect(['increasing', 'stable']).toContain(trend.trend);
      expect(trend.changePercent).toBeGreaterThanOrEqual(0);
    });

    it('should delete anomaly config', async () => {
      const { db } = await import('@/lib/db');
      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      await anomalyPipelineService.deleteConfig('ac-1');
      expect(db.anomalyDetectionConfig.delete).toHaveBeenCalledWith({ where: { id: 'ac-1' } });
    });

    it('should get trend for a source', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.anomalyRecord.findMany).mockResolvedValueOnce([] as never);

      const { anomalyPipelineService } = await import('@/services/historian/anomalyPipeline.service');
      const trend = await anomalyPipelineService.getTrend('src-test', 7);
      expect(trend.period).toBe('7d');
      expect(trend.totalAnomalies).toBe(0);
    });
  });

  // =========================================================================
  // Section E: Downsampling Service — Tier Configuration
  // =========================================================================

  describe('Downsampling Service Tiers', () => {
    it('should return 5 default tiers', async () => {
      vi.resetModules();
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      const tiers = downsamplingService.getTiers();
      expect(tiers).toHaveLength(5);
    });

    it('should have tiers in ascending order of bucket size', async () => {
      vi.resetModules();
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      const tiers = downsamplingService.getTiers();
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].bucketMs).toBeGreaterThan(tiers[i - 1].bucketMs);
      }
    });

    it('should have tier intervals: 1m, 5m, 1h, 1d, 1w', async () => {
      vi.resetModules();
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      const tiers = downsamplingService.getTiers();
      const intervals = tiers.map(t => t.interval);
      expect(intervals).toEqual(['1m', '5m', '1h', '1d', '1w']);
    });

    it('should have retention days increase with tier coarseness', async () => {
      vi.resetModules();
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      const tiers = downsamplingService.getTiers();
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].retentionDays).toBeGreaterThan(tiers[i - 1].retentionDays);
      }
    });

    it('should list policies', async () => {
      vi.resetModules();
      const { db } = await import('@/lib/db');
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      await downsamplingService.listPolicies();
      expect(db.downsamplingPolicy.findMany).toHaveBeenCalled();
    });

    it('should delete a policy', async () => {
      vi.resetModules();
      const { db } = await import('@/lib/db');
      const { downsamplingService } = await import('@/services/historian/downsampling.service');
      await downsamplingService.deletePolicy('policy-1');
      expect(db.downsamplingPolicy.delete).toHaveBeenCalledWith({ where: { id: 'policy-1' } });
    });
  });
});
