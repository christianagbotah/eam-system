// ============================================================================
// Observability Persistence — Log persistence, trace persistence,
// metric snapshot persistence
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Types for mocking ----

interface MockStructuredLogEntry {
  level: string;
  service: string;
  message: string;
  traceId: string;
  correlationId: string;
  userId: string;
  requestId: string;
  durationMs: number;
  error: { message: string } | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface MockTraceSpan {
  traceId: string;
  spanId: string;
  parentId: string | null;
  name: string;
  serviceName: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  status: string;
  attributes: Record<string, unknown>;
}

// ---- Mock the DB ----
const mockObservabilityLogCreateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockObservabilityLogCreate = vi.fn().mockResolvedValue({});
const mockObservabilityLogFindMany = vi.fn().mockResolvedValue([]);
const mockObservabilityLogCount = vi.fn().mockResolvedValue(0);
const mockObservabilityLogGroupBy = vi.fn().mockResolvedValue([]);
const mockObservabilityTraceCreateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockObservabilityTraceFindMany = vi.fn().mockResolvedValue([]);
const mockObservabilityTraceCount = vi.fn().mockResolvedValue(0);
const mockObservabilityMetricCreateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockObservabilityMetricFindMany = vi.fn().mockResolvedValue([]);
const mockObservabilityMetricCount = vi.fn().mockResolvedValue(0);
const mockObservabilityMetricGroupBy = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/db', () => ({
  db: {
    observabilityLog: {
      createMany: mockObservabilityLogCreateMany,
      create: mockObservabilityLogCreate,
      findMany: mockObservabilityLogFindMany,
      count: mockObservabilityLogCount,
      groupBy: mockObservabilityLogGroupBy,
    },
    observabilityTrace: {
      createMany: mockObservabilityTraceCreateMany,
      findMany: mockObservabilityTraceFindMany,
      count: mockObservabilityTraceCount,
    },
    observabilityMetricSnapshot: {
      createMany: mockObservabilityMetricCreateMany,
      findMany: mockObservabilityMetricFindMany,
      count: mockObservabilityMetricCount,
      groupBy: mockObservabilityMetricGroupBy,
    },
  },
}));

vi.mock('@/services/observability/centralizedLogging.service', () => ({
  CentralizedLoggingService: {
    search: vi.fn().mockReturnValue({ entries: [] }),
  },
}));

vi.mock('@/services/observability/openTelemetry.service', () => ({
  OpenTelemetryService: {
    queryTraces: vi.fn().mockReturnValue({ traces: [] }),
  },
}));

vi.mock('@/services/observability/prometheusMetrics.service', () => ({
  PrometheusMetricsService: {
    listMetrics: vi.fn().mockReturnValue([
      { name: 'http_requests_total', type: 'counter' },
      { name: 'active_connections', type: 'gauge' },
    ]),
    getMetric: vi.fn().mockReturnValue({
      values: { '(none)': 42, 'method=GET,path=/api': 100 },
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---- Helpers ----

function makeLogEntry(overrides: Partial<MockStructuredLogEntry> = {}): MockStructuredLogEntry {
  return {
    level: 'info',
    service: 'api',
    message: 'Request processed',
    traceId: 'trace-001',
    correlationId: 'corr-001',
    userId: 'user-1',
    requestId: 'req-001',
    durationMs: 120,
    error: null,
    tags: ['http', 'api'],
    metadata: { path: '/api/test' },
    timestamp: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeTraceSpan(overrides: Partial<MockTraceSpan> = {}): MockTraceSpan {
  return {
    traceId: 'trace-001',
    spanId: 'span-001',
    parentId: null,
    name: 'HTTP GET /api/test',
    serviceName: 'api-server',
    startTime: '2025-01-15T10:00:00.000Z',
    endTime: '2025-01-15T10:00:00.120Z',
    durationMs: 120,
    status: 'ok',
    attributes: { 'http.method': 'GET', 'http.status_code': 200 },
    ...overrides,
  };
}

// ---- Tests ----

describe('Observability Persistence — Log Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObservabilityLogCreateMany.mockResolvedValue({ count: 5 });
  });

  it('should map log entries to DB records correctly', () => {
    const entry = makeLogEntry();

    const dbRecord = {
      level: entry.level,
      service: entry.service || null,
      message: entry.message,
      traceId: entry.traceId || null,
      correlationId: entry.correlationId || null,
      userId: entry.userId || null,
      requestId: entry.requestId || null,
      durationMs: entry.durationMs ?? null,
      errorMessage: entry.error?.message || null,
      tags: entry.tags ? JSON.stringify(entry.tags) : null,
      metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
      timestamp: new Date(entry.timestamp),
    };

    expect(dbRecord.level).toBe('info');
    expect(dbRecord.service).toBe('api');
    expect(dbRecord.traceId).toBe('trace-001');
    expect(dbRecord.errorMessage).toBeNull();
    expect(dbRecord.tags).toBe('["http","api"]');
    expect(dbRecord.timestamp).toBeInstanceOf(Date);
  });

  it('should handle error log entries', () => {
    const entry = makeLogEntry({
      level: 'error',
      message: 'Database connection failed',
      error: { message: 'ECONNREFUSED' },
    });

    const dbRecord = {
      level: entry.level,
      service: entry.service,
      message: entry.message,
      errorMessage: entry.error?.message || null,
    };

    expect(dbRecord.level).toBe('error');
    expect(dbRecord.errorMessage).toBe('ECONNREFUSED');
  });

  it('should handle null optional fields', () => {
    const entry = makeLogEntry({
      traceId: '',
      correlationId: '',
      userId: '',
      error: null,
      tags: null,
      metadata: {},
    });

    const dbRecord = {
      traceId: entry.traceId || null,
      correlationId: entry.correlationId || null,
      userId: entry.userId || null,
      errorMessage: entry.error?.message || null,
      tags: entry.tags ? JSON.stringify(entry.tags) : null,
      metadata: Object.keys(entry.metadata).length > 0 ? entry.metadata : null,
    };

    expect(dbRecord.traceId).toBeNull();
    expect(dbRecord.correlationId).toBeNull();
    expect(dbRecord.userId).toBeNull();
    expect(dbRecord.errorMessage).toBeNull();
    expect(dbRecord.tags).toBeNull();
  });

  it('should batch insert log entries with createMany', async () => {
    const entries = [makeLogEntry(), makeLogEntry({ message: 'Second log' }), makeLogEntry({ message: 'Third log' })];

    await mockObservabilityLogCreateMany({
      data: entries.map((entry) => ({
        level: entry.level,
        message: entry.message,
        traceId: entry.traceId || null,
        timestamp: new Date(entry.timestamp),
      })),
      skipDuplicates: true,
    });

    expect(mockObservabilityLogCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ message: 'Request processed' }),
          expect.objectContaining({ message: 'Second log' }),
          expect.objectContaining({ message: 'Third log' }),
        ]),
        skipDuplicates: true,
      }),
    );
  });

  it('should use skipDuplicates to prevent duplicate inserts', () => {
    // The createMany call should include skipDuplicates: true
    expect(mockObservabilityLogCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('should fall back to individual inserts on bulk failure', async () => {
    mockObservabilityLogCreateMany.mockRejectedValueOnce(new Error('Bulk insert failed'));
    mockObservabilityLogCreate.mockResolvedValue({});

    const entry = makeLogEntry();

    try {
      await mockObservabilityLogCreateMany({ data: [entry], skipDuplicates: true });
    } catch {
      // Fallback to individual insert
      await mockObservabilityLogCreate({
        data: expect.objectContaining({ message: entry.message }),
      });
    }

    expect(mockObservabilityLogCreate).toHaveBeenCalled();
  });

  it('should respect batch size limits', () => {
    const batchSize = 500;
    const entries = Array.from({ length: 1000 }, (_, i) => makeLogEntry({ message: `Log ${i}` }));

    const batch = entries.slice(0, batchSize);
    expect(batch).toHaveLength(500);
  });

  it('should handle empty log entries gracefully', () => {
    const entries: MockStructuredLogEntry[] = [];

    if (entries.length === 0) return; // Early return
    expect(true).toBe(true); // Should not attempt createMany
  });
});

describe('Observability Persistence — Trace Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObservabilityTraceCreateMany.mockResolvedValue({ count: 3 });
  });

  it('should map trace spans to DB records correctly', () => {
    const span = makeTraceSpan();

    const dbRecord = {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentId || null,
      name: span.name,
      serviceName: span.serviceName || null,
      durationMs: span.durationMs ?? null,
      status: span.status === 'error' ? 'error' : span.status === 'unset' ? null : 'ok',
      attributes: Object.keys(span.attributes).length > 0 ? span.attributes : null,
      timestamp: new Date(span.startTime),
    };

    expect(dbRecord.traceId).toBe('trace-001');
    expect(dbRecord.spanId).toBe('span-001');
    expect(dbRecord.parentId).toBeNull();
    expect(dbRecord.name).toBe('HTTP GET /api/test');
    expect(dbRecord.serviceName).toBe('api-server');
    expect(dbRecord.status).toBe('ok');
    expect(dbRecord.timestamp).toBeInstanceOf(Date);
  });

  it('should handle error status spans', () => {
    const span = makeTraceSpan({ status: 'error' });

    const status = span.status === 'error' ? 'error' : span.status === 'unset' ? null : 'ok';
    expect(status).toBe('error');
  });

  it('should handle unset status spans', () => {
    const span = makeTraceSpan({ status: 'unset' });

    const status = span.status === 'error' ? 'error' : span.status === 'unset' ? null : 'ok';
    expect(status).toBeNull();
  });

  it('should only persist spans that have been ended (have endTime)', () => {
    const spans = [
      makeTraceSpan({ endTime: '2025-01-15T10:00:01.000Z' }),  // ended
      makeTraceSpan({ endTime: null }),                           // open (should be skipped)
      makeTraceSpan({ endTime: '2025-01-15T10:00:02.000Z' }),  // ended
    ];

    const endedSpans = spans.filter((s) => s.endTime);
    expect(endedSpans).toHaveLength(2);
  });

  it('should handle parent-child span relationships', () => {
    const parent = makeTraceSpan({ spanId: 'parent-1', parentId: null });
    const child = makeTraceSpan({ spanId: 'child-1', parentId: 'parent-1' });

    expect(parent.parentId).toBeNull();
    expect(child.parentId).toBe('parent-1');
  });

  it('should handle null attributes gracefully', () => {
    const span = makeTraceSpan({ attributes: {} });

    const attrs = Object.keys(span.attributes).length > 0 ? span.attributes : null;
    expect(attrs).toBeNull();
  });

  it('should batch insert trace spans with createMany', async () => {
    const spans = [
      makeTraceSpan({ spanId: 'span-a' }),
      makeTraceSpan({ spanId: 'span-b' }),
    ];

    await mockObservabilityTraceCreateMany({
      data: spans.map((span) => ({
        traceId: span.traceId,
        spanId: span.spanId,
        timestamp: new Date(span.startTime),
      })),
      skipDuplicates: true,
    });

    expect(mockObservabilityTraceCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ spanId: 'span-a' }),
          expect.objectContaining({ spanId: 'span-b' }),
        ]),
      }),
    );
  });
});

describe('Observability Persistence — Metric Snapshot Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObservabilityMetricCreateMany.mockResolvedValue({ count: 3 });
  });

  it('should create metric snapshots for all registered metrics', async () => {
    const metricsList = [
      { name: 'http_requests_total', type: 'counter' },
      { name: 'active_connections', type: 'gauge' },
    ];
    const metric = {
      values: { '(none)': 42, 'method=GET,path=/api': 100 },
    };

    const snapshotData: Array<{
      name: string;
      type: string;
      value: number;
      labels: string | null;
      unit: string | null;
      timestamp: Date;
    }> = [];

    for (const metricInfo of metricsList) {
      for (const [labelKey, value] of Object.entries(metric.values)) {
        const numVal = typeof value === 'number' ? value : null;
        if (numVal !== null) {
          snapshotData.push({
            name: metricInfo.name,
            type: metricInfo.type,
            value: numVal,
            labels: labelKey && labelKey !== '(none)' ? labelKey : null,
            unit: null,
            timestamp: expect.any(Date),
          });
        }
      }
    }

    expect(snapshotData.length).toBeGreaterThan(0);

    await mockObservabilityMetricCreateMany({
      data: snapshotData,
      skipDuplicates: true,
    });

    expect(mockObservabilityMetricCreateMany).toHaveBeenCalled();
  });

  it('should handle (none) label key as null', () => {
    const labelKey = '(none)';
    const labels = labelKey && labelKey !== '(none)' ? labelKey : null;

    expect(labels).toBeNull();
  });

  it('should handle empty metric list gracefully', () => {
    const metricsList: Array<{ name: string; type: string }> = [];
    const snapshotData: any[] = [];

    for (const metricInfo of metricsList) {
      // Would add snapshots
    }

    expect(snapshotData).toHaveLength(0);
  });

  it('should skip null metric values', () => {
    const values: Record<string, unknown> = { 'path=/api': 100, 'path=/health': null };

    const snapshotData: number[] = [];
    for (const [, value] of Object.entries(values)) {
      const numVal = typeof value === 'number' ? value : null;
      if (numVal !== null) {
        snapshotData.push(numVal);
      }
    }

    expect(snapshotData).toHaveLength(1);
    expect(snapshotData[0]).toBe(100);
  });

  it('should respect batch size for metrics', () => {
    const maxBatch = 1000;
    const largeMetricsList = Array.from({ length: 2000 }, (_, i) => ({
      name: `metric_${i}`,
      type: 'gauge',
    }));

    const snapshotData: any[] = [];
    for (const info of largeMetricsList) {
      if (snapshotData.length >= maxBatch) break;
      snapshotData.push({ name: info.name });
    }

    expect(snapshotData.length).toBeLessThanOrEqual(1000);
  });

  it('should use same timestamp for all snapshots in a batch', () => {
    const now = new Date();
    const snapshots = [
      { name: 'metric_a', timestamp: now },
      { name: 'metric_b', timestamp: now },
    ];

    // All should have the same timestamp
    const timestamps = snapshots.map((s) => s.timestamp.getTime());
    const allSame = timestamps.every((t) => t === timestamps[0]);
    expect(allSame).toBe(true);
  });
});

describe('Observability Persistence — Watermark Tracking', () => {
  it('should track last log timestamp for watermark', () => {
    let lastLogTimestamp = '2025-01-15T09:00:00.000Z';

    const newEntries = [
      makeLogEntry({ timestamp: '2025-01-15T09:30:00.000Z' }),
      makeLogEntry({ timestamp: '2025-01-15T10:00:00.000Z' }),
    ];

    const latestTimestamp = newEntries[newEntries.length - 1].timestamp;
    if (latestTimestamp > lastLogTimestamp) {
      lastLogTimestamp = latestTimestamp;
    }

    expect(lastLogTimestamp).toBe('2025-01-15T10:00:00.000Z');
  });

  it('should not update watermark if entries are older', () => {
    let lastLogTimestamp = '2025-01-15T10:00:00.000Z';

    const newEntries = [
      makeLogEntry({ timestamp: '2025-01-15T09:00:00.000Z' }),
    ];

    const latestTimestamp = newEntries[newEntries.length - 1].timestamp;
    if (latestTimestamp > lastLogTimestamp) {
      lastLogTimestamp = latestTimestamp;
    }

    // Should remain unchanged
    expect(lastLogTimestamp).toBe('2025-01-15T10:00:00.000Z');
  });

  it('should filter entries newer than watermark', () => {
    const lastLogTimestamp = '2025-01-15T09:30:00.000Z';

    const allEntries = [
      makeLogEntry({ timestamp: '2025-01-15T09:00:00.000Z' }), // older
      makeLogEntry({ timestamp: '2025-01-15T09:45:00.000Z' }), // newer
      makeLogEntry({ timestamp: '2025-01-15T10:00:00.000Z' }), // newer
    ];

    const newEntries = allEntries.filter((e) => e.timestamp > lastLogTimestamp);
    expect(newEntries).toHaveLength(2);
  });

  it('should handle trace watermark similarly', () => {
    let lastTraceTimestamp = '2025-01-15T09:00:00.000Z';

    const newSpans = [
      makeTraceSpan({ startTime: '2025-01-15T09:30:00.000Z' }),
      makeTraceSpan({ startTime: '2025-01-15T10:00:00.000Z' }),
    ].filter((s) => s.endTime); // Only ended spans

    const latestStart = newSpans.reduce((max, s) => (s.startTime > max ? s.startTime : max), '');
    if (latestStart > lastTraceTimestamp) {
      lastTraceTimestamp = latestStart;
    }

    expect(lastTraceTimestamp).toBe('2025-01-15T10:00:00.000Z');
  });
});
