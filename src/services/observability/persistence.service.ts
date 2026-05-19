// ============================================================================
// OBSERVABILITY PERSISTENCE SERVICE — DB persistence & log shipping readiness
// ============================================================================
//
// Periodically flushes in-memory observability data (logs, traces, metrics)
// to the database for long-term storage. Supports configurable flush intervals,
// batch sizes, graceful shutdown, and historical queries for log shipping.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { CentralizedLoggingService, type StructuredLogEntry } from './centralizedLogging.service';
import { OpenTelemetryService, type TraceSpan } from './openTelemetry.service';
import { PrometheusMetricsService } from './prometheusMetrics.service';

const logger = createLogger('observability-persistence');

// ── Types ───────────────────────────────────────────────────────────────────

export interface PersistenceConfig {
  flushIntervalMs: number;     // default 30s
  logsBatchSize: number;       // default 500
  tracesBatchSize: number;     // default 500
  metricsBatchSize: number;    // default 1000
  maxRetentionDays: number;    // default 90 days for DB records
  enabled: boolean;            // master switch
}

export interface PersistResult {
  logsInserted: number;
  tracesInserted: number;
  metricsInserted: number;
  logsErrors: number;
  tracesErrors: number;
  metricsErrors: number;
  durationMs: number;
}

export interface HistoricalLogQuery {
  level?: string;
  service?: string;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface HistoricalTraceQuery {
  traceId?: string;
  serviceName?: string;
  name?: string;
  minDurationMs?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface HistoricalMetricQuery {
  name?: string;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ── State ───────────────────────────────────────────────────────────────────

const defaultConfig: PersistenceConfig = {
  flushIntervalMs: 30_000,
  logsBatchSize: 500,
  tracesBatchSize: 500,
  metricsBatchSize: 1000,
  maxRetentionDays: 90,
  enabled: true,
};

let config: PersistenceConfig = { ...defaultConfig };
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let isShuttingDown = false;

// Track last persisted watermark per data source to avoid re-inserting
let lastLogTimestamp = '';
let lastTraceTimestamp = '';
let lastMetricSnapshotAt = '';

// Counters for stats
let totalLogsPersisted = 0;
let totalTracesPersisted = 0;
let totalMetricsPersisted = 0;
let lastFlushResult: PersistResult | null = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the Prisma-like DB client. Uses dynamic import to avoid circular deps.
 * Falls back gracefully if DB is unavailable.
 */
async function getDb() {
  try {
    const { db } = await import('@/lib/db');
    return db;
  } catch {
    return null;
  }
}

/**
 * Safely execute a DB operation with error handling.
 * Returns null if the operation fails.
 */
async function safeDbOp<T>(fn: (db: any) => Promise<T>): Promise<T | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return await fn(db);
  } catch (error: unknown) {
    // Only log at debug level for expected errors (DB unavailable in sandbox)
    const msg = (error as Error)?.message || String(error);
    if (msg.includes('database not initialized') || msg.includes('Query.*skipped')) {
      return null;
    }
    logger.warn('DB operation failed in persistence service', { error: msg });
    return null;
  }
}

// ── Core Persistence Methods ────────────────────────────────────────────────

/**
 * Persist in-memory log entries to the ObservabilityLog table.
 * Uses watermark tracking to only insert new entries since last flush.
 */
export async function persistLogs(
  entries?: StructuredLogEntry[],
  batchSize?: number,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  await safeDbOp(async (db) => {
    // If no entries provided, grab all from the in-memory service
    if (!entries) {
      // We can't directly access logBuffer, so we use search with broad params
      const searchResult = CentralizedLoggingService.search({
        since: lastLogTimestamp || undefined,
        limit: batchSize || config.logsBatchSize,
        offset: 0,
      });
      entries = searchResult.entries;
    }

    if (!entries || entries.length === 0) return;

    // Filter to only entries newer than our watermark
    const newEntries = entries.filter(e => e.timestamp > lastLogTimestamp);
    if (newEntries.length === 0) return;

    const batch = newEntries.slice(0, batchSize || config.logsBatchSize);

    try {
      await db.observabilityLog.createMany({
        data: batch.map(entry => ({
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
          metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) as object : null,
          timestamp: new Date(entry.timestamp),
        })),
        skipDuplicates: true,
      });

      inserted = batch.length;

      // Update watermark
      const latestTimestamp = batch[batch.length - 1].timestamp;
      if (latestTimestamp > lastLogTimestamp) {
        lastLogTimestamp = latestTimestamp;
      }
    } catch (err: unknown) {
      errors = batch.length;
      const msg = (err as Error)?.message || String(err);
      logger.warn('Failed to persist log batch', { count: batch.length, error: msg });

      // Try individual inserts as fallback
      for (const entry of batch) {
        try {
          await db.observabilityLog.create({
            data: {
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
              metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) as object : null,
              timestamp: new Date(entry.timestamp),
            },
          });
          inserted++;
          errors--;
        } catch {
          // Skip individual failures
        }
      }

      if (batch[batch.length - 1].timestamp > lastLogTimestamp) {
        lastLogTimestamp = batch[batch.length - 1].timestamp;
      }
    }
  });

  if (inserted > 0) {
    totalLogsPersisted += inserted;
  }

  return { inserted, errors };
}

/**
 * Persist completed trace spans to the ObservabilityTrace table.
 * Only persists spans that have been ended (have an endTime).
 */
export async function persistTraces(
  spans?: TraceSpan[],
  batchSize?: number,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  await safeDbOp(async (db) => {
    if (!spans) {
      // Query all completed traces from the in-memory service
      const queryResult = OpenTelemetryService.queryTraces({
        since: lastTraceTimestamp || undefined,
        limit: batchSize || config.tracesBatchSize,
      });
      // Only persist spans that have been ended (completed)
      spans = queryResult.traces.filter(s => s.endTime);
    }

    if (!spans || spans.length === 0) return;

    const newSpans = spans.filter(s => s.startTime > lastTraceTimestamp && s.endTime);
    if (newSpans.length === 0) return;

    const batch = newSpans.slice(0, batchSize || config.tracesBatchSize);

    try {
      await db.observabilityTrace.createMany({
        data: batch.map(span => ({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentId || null,
          name: span.name,
          serviceName: span.serviceName || null,
          durationMs: span.durationMs ?? null,
          status: span.status === 'error' ? 'error' : span.status === 'unset' ? null : 'ok',
          attributes: Object.keys(span.attributes).length > 0
            ? JSON.parse(JSON.stringify(span.attributes)) as object
            : null,
          timestamp: new Date(span.startTime),
        })),
        skipDuplicates: true,
      });

      inserted = batch.length;

      // Update watermark
      const latestStart = batch.reduce((max, s) => s.startTime > max ? s.startTime : max, '');
      if (latestStart > lastTraceTimestamp) {
        lastTraceTimestamp = latestStart;
      }
    } catch (err: unknown) {
      errors = batch.length;
      const msg = (err as Error)?.message || String(err);
      logger.warn('Failed to persist trace batch', { count: batch.length, error: msg });

      // Update watermark even on failure to avoid retrying same entries
      const latestStart = batch.reduce((max, s) => s.startTime > max ? s.startTime : max, '');
      if (latestStart > lastTraceTimestamp) {
        lastTraceTimestamp = latestStart;
      }
    }
  });

  if (inserted > 0) {
    totalTracesPersisted += inserted;
  }

  return { inserted, errors };
}

/**
 * Persist current metric values as snapshots to the ObservabilityMetricSnapshot table.
 * Records point-in-time values of all registered metrics.
 */
export async function persistMetrics(
  batchSize?: number,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  await safeDbOp(async (db) => {
    const metricsList = PrometheusMetricsService.listMetrics();
    if (metricsList.length === 0) return;

    const now = new Date();
    const snapshotData: Array<{
      name: string;
      type: string;
      value: number;
      labels: string | null;
      unit: string | null;
      timestamp: Date;
    }> = [];

    for (const metricInfo of metricsList) {
      const metric = PrometheusMetricsService.getMetric(metricInfo.name);
      if (!metric) continue;

      const values = metric.values;
      for (const [labelKey, value] of Object.entries(values)) {
        const numVal = typeof value === 'number' ? value : null;
        if (numVal === null) continue;

        snapshotData.push({
          name: metricInfo.name,
          type: metricInfo.type,
          value: numVal,
          labels: labelKey && labelKey !== '(none)' ? labelKey : null,
          unit: null, // could be enhanced later
          timestamp: now,
        });

        if (snapshotData.length >= (batchSize || config.metricsBatchSize)) break;
      }
      if (snapshotData.length >= (batchSize || config.metricsBatchSize)) break;
    }

    if (snapshotData.length === 0) return;

    try {
      await db.observabilityMetricSnapshot.createMany({
        data: snapshotData,
        skipDuplicates: true,
      });

      inserted = snapshotData.length;
      lastMetricSnapshotAt = now.toISOString();
    } catch (err: unknown) {
      errors = snapshotData.length;
      const msg = (err as Error)?.message || String(err);
      logger.warn('Failed to persist metric snapshots', { count: snapshotData.length, error: msg });
      lastMetricSnapshotAt = now.toISOString(); // update even on failure
    }
  });

  if (inserted > 0) {
    totalMetricsPersisted += inserted;
  }

  return { inserted, errors };
}

// ── Historical Query Methods ────────────────────────────────────────────────

/**
 * Query persisted logs from the database with filtering and pagination.
 */
export async function queryHistoricalLogs(query: HistoricalLogQuery) {
  const limit = Math.min(query.limit || 50, 500);
  const offset = Math.max(query.offset || 0, 0);

  return safeDbOp(async (db: any) => {
    const where: any = {};

    if (query.level) where.level = query.level;
    if (query.service) where.service = query.service;
    if (query.traceId) where.traceId = query.traceId;
    if (query.correlationId) where.correlationId = query.correlationId;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.message = { contains: query.search, mode: 'insensitive' };
    }
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }

    const [logs, total] = await Promise.all([
      db.observabilityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.observabilityLog.count({ where }),
    ]);

    // Summary stats for the same query window
    const summaryWhere = { ...where };
    const [levelStats, serviceStats] = await Promise.all([
      db.observabilityLog.groupBy({
        by: ['level'],
        where: summaryWhere,
        _count: true,
      }),
      db.observabilityLog.groupBy({
        by: ['service'],
        where: summaryWhere,
        _count: { service: true },
        orderBy: { _count: { service: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      summary: {
        byLevel: Object.fromEntries(levelStats.map((s: any) => [s.level, s._count])),
        topServices: serviceStats.map((s: any) => ({ service: s.service, count: s._count.service })),
      },
    };
  });
}

/**
 * Query persisted traces from the database.
 * Returns spans grouped by traceId, forming a tree structure.
 */
export async function queryHistoricalTraces(query: HistoricalTraceQuery) {
  const limit = Math.min(query.limit || 50, 500);
  const offset = Math.max(query.offset || 0, 0);

  return safeDbOp(async (db: any) => {
    const where: any = {};

    if (query.traceId) where.traceId = query.traceId;
    if (query.serviceName) where.serviceName = query.serviceName;
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query.minDurationMs) where.durationMs = { gte: query.minDurationMs };
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }

    const [spans, total] = await Promise.all([
      db.observabilityTrace.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.observabilityTrace.count({ where }),
    ]);

    // Group spans by traceId for tree structure
    const traceGroups = new Map<string, any[]>();
    for (const span of spans) {
      const existing = traceGroups.get(span.traceId) || [];
      existing.push(span);
      traceGroups.set(span.traceId, existing);
    }

    // Build trace tree for each group
    const traces = Array.from(traceGroups.entries()).map(([traceId, traceSpans]) => {
      const rootSpans = traceSpans.filter(s => !s.parentSpanId);

      function buildTree(span: any): any {
        const children = traceSpans.filter(s => s.parentSpanId === span.spanId);
        return {
          ...span,
          children: children.map(buildTree),
        };
      }

      const roots = rootSpans.length > 0
        ? rootSpans.map(buildTree)
        : traceSpans.map(buildTree);

      const totalDuration = traceSpans.reduce((max: number, s: any) =>
        Math.max(max, s.durationMs || 0), 0);

      return {
        traceId,
        rootSpans: roots,
        spanCount: traceSpans.length,
        totalDurationMs: totalDuration,
        serviceNames: [...new Set(traceSpans.map((s: any) => s.serviceName).filter(Boolean))],
      };
    });

    return {
      traces,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  });
}

/**
 * Query persisted metric snapshots from the database.
 */
export async function queryHistoricalMetrics(query: HistoricalMetricQuery) {
  const limit = Math.min(query.limit || 50, 1000);
  const offset = Math.max(query.offset || 0, 0);

  return safeDbOp(async (db: any) => {
    const where: any = {};

    if (query.name) where.name = query.name;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }

    const [snapshots, total] = await Promise.all([
      db.observabilityMetricSnapshot.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.observabilityMetricSnapshot.count({ where }),
    ]);

    // Group by metric name for summary
    const nameStats = await db.observabilityMetricSnapshot.groupBy({
      by: ['name', 'type'],
      where,
      _count: true,
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true },
    });

    return {
      snapshots,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      summary: nameStats.map((s: any) => ({
        name: s.name,
        type: s.type,
        count: s._count,
        avgValue: Math.round((s._avg.value || 0) * 100) / 100,
        maxValue: s._max.value,
        minValue: s._min.value,
      })),
    };
  });
}

// ── Flush / Lifecycle ───────────────────────────────────────────────────────

/**
 * Execute a full flush cycle: persist logs, traces, and metrics.
 */
export async function flush(): Promise<PersistResult> {
  if (isShuttingDown) {
    logger.info('Skipping flush — service is shutting down');
    return { logsInserted: 0, tracesInserted: 0, metricsInserted: 0, logsErrors: 0, tracesErrors: 0, metricsErrors: 0, durationMs: 0 };
  }

  const startTime = Date.now();
  const [logsResult, tracesResult, metricsResult] = await Promise.all([
    persistLogs(),
    persistTraces(),
    persistMetrics(),
  ]);

  const durationMs = Date.now() - startTime;
  const result: PersistResult = {
    logsInserted: logsResult.inserted,
    tracesInserted: tracesResult.inserted,
    metricsInserted: metricsResult.inserted,
    logsErrors: logsResult.errors,
    tracesErrors: tracesResult.errors,
    metricsErrors: metricsResult.errors,
    durationMs,
  };

  lastFlushResult = result;

  // Only log if something was persisted
  const totalInserted = result.logsInserted + result.tracesInserted + result.metricsInserted;
  if (totalInserted > 0) {
    logger.info('Observability data flushed', {
      logs: result.logsInserted,
      traces: result.tracesInserted,
      metrics: result.metricsInserted,
      errors: result.logsErrors + result.tracesErrors + result.metricsErrors,
      durationMs: result.durationMs,
    });
  }

  return result;
}

/**
 * Perform a graceful shutdown flush — persists all remaining in-memory data.
 */
export async function gracefulShutdown(): Promise<PersistResult> {
  isShuttingDown = true;
  logger.info('Graceful shutdown initiated — flushing all remaining observability data');

  // Stop the periodic timer
  stop();

  // Increase batch sizes for shutdown flush
  const prevBatchLogs = config.logsBatchSize;
  const prevBatchTraces = config.tracesBatchSize;
  const prevBatchMetrics = config.metricsBatchSize;

  config.logsBatchSize = 5000;
  config.tracesBatchSize = 5000;
  config.metricsBatchSize = 5000;

  const result = await flush();

  // Restore batch sizes
  config.logsBatchSize = prevBatchLogs;
  config.tracesBatchSize = prevBatchTraces;
  config.metricsBatchSize = prevBatchMetrics;

  logger.info('Graceful shutdown flush complete', {
    logs: result.logsInserted,
    traces: result.tracesInserted,
    metrics: result.metricsInserted,
    totalPersisted: { logs: totalLogsPersisted, traces: totalTracesPersisted, metrics: totalMetricsPersisted },
  });

  return result;
}

/**
 * Start the periodic persistence flush.
 */
export function start(configOverrides?: Partial<PersistenceConfig>): void {
  if (isRunning) {
    logger.warn('Persistence service is already running');
    return;
  }

  if (configOverrides) {
    config = { ...config, ...configOverrides };
  }

  if (!config.enabled) {
    logger.info('Persistence service disabled by configuration');
    return;
  }

  isRunning = true;

  // Register shutdown handlers
  const shutdownHandler = async () => {
    await gracefulShutdown();
    process.exit(0);
  };
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  // Start periodic flush
  flushTimer = setInterval(() => {
    flush().catch((err) => {
      logger.error('Periodic flush failed', { error: (err as Error)?.message });
    });
  }, config.flushIntervalMs);

  if (flushTimer.unref) flushTimer.unref();

  // Run initial flush after a short delay to let the app start up
  setTimeout(() => {
    flush().catch((err) => {
      logger.error('Initial flush failed', { error: (err as Error)?.message });
    });
  }, 5000).unref();

  logger.info('Observability persistence service started', {
    flushIntervalMs: config.flushIntervalMs,
    logsBatchSize: config.logsBatchSize,
    tracesBatchSize: config.tracesBatchSize,
    metricsBatchSize: config.metricsBatchSize,
    maxRetentionDays: config.maxRetentionDays,
  });
}

/**
 * Stop the periodic persistence flush.
 */
export function stop(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  isRunning = false;
}

// ── Status / Config ─────────────────────────────────────────────────────────

/**
 * Get the current persistence service status.
 */
export function getStatus(): {
  isRunning: boolean;
  isShuttingDown: boolean;
  config: PersistenceConfig;
  totalPersisted: { logs: number; traces: number; metrics: number };
  lastFlush: PersistResult | null;
  watermarks: { logs: string; traces: string; metrics: string };
} {
  return {
    isRunning,
    isShuttingDown,
    config: { ...config },
    totalPersisted: {
      logs: totalLogsPersisted,
      traces: totalTracesPersisted,
      metrics: totalMetricsPersisted,
    },
    lastFlush: lastFlushResult,
    watermarks: {
      logs: lastLogTimestamp,
      traces: lastTraceTimestamp,
      metrics: lastMetricSnapshotAt,
    },
  };
}

/**
 * Update the persistence configuration.
 */
export function updateConfig(patch: Partial<PersistenceConfig>): PersistenceConfig {
  config = { ...config, ...patch };
  logger.info('Persistence config updated', { ...config });

  // If interval changed and service is running, restart the timer
  if (patch.flushIntervalMs && isRunning) {
    stop();
    start();
  }

  return { ...config };
}

/**
 * Export observability data for log shipping to external tools (ELK, Grafana, etc.)
 */
export async function exportData(params: {
  type: 'logs' | 'traces' | 'metrics';
  from?: string;
  to?: string;
  format?: 'json';
  limit?: number;
}): Promise<{ data: unknown; total: number; exportedAt: string } | null> {
  const { type, from, to, limit = 10000 } = params;

  switch (type) {
    case 'logs': {
      const result = await queryHistoricalLogs({
        from,
        to,
        limit: Math.min(limit, 50000),
        offset: 0,
      });
      if (!result) return null;
      return {
        data: result.logs,
        total: result.total,
        exportedAt: new Date().toISOString(),
      };
    }
    case 'traces': {
      const result = await queryHistoricalTraces({
        from,
        to,
        limit: Math.min(limit, 50000),
        offset: 0,
      });
      if (!result) return null;
      return {
        data: result.traces,
        total: result.total,
        exportedAt: new Date().toISOString(),
      };
    }
    case 'metrics': {
      const result = await queryHistoricalMetrics({
        from,
        to,
        limit: Math.min(limit, 50000),
        offset: 0,
      });
      if (!result) return null;
      return {
        data: result.snapshots,
        total: result.total,
        exportedAt: new Date().toISOString(),
      };
    }
    default:
      return null;
  }
}

// ── Auto-start on import (in server context) ────────────────────────────────

// Only auto-start in Node.js server context, not during build/SSG
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Defer start to allow other services to initialize
  setTimeout(() => {
    start();
  }, 10_000).unref();
}
