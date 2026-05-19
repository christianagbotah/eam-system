// ============================================================================
// OPEN TELEMETRY SERVICE — Distributed tracing, span management, context propagation
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('openTelemetry');

// ── Types ───────────────────────────────────────────────────────────────────

export type SpanStatus = 'ok' | 'error' | 'unset';

export interface TraceSpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentId?: string;
  name: string;
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  startTime: string;
  endTime?: string;
  status: SpanStatus;
  statusMessage?: string;
  attributes: Record<string, unknown>;
  events: TraceSpanEvent[];
  durationMs?: number;
  serviceName: string;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentId?: string;
  traceFlags?: string;
  traceState?: Record<string, string>;
}

export type SamplingStrategy = 'always' | 'never' | 'probability' | 'adaptive';

export interface SamplingConfig {
  strategy: SamplingStrategy;
  probability?: number;       // 0.0 – 1.0 (used when strategy === 'probability')
  adaptiveThreshold?: number; // error rate threshold (used when strategy === 'adaptive')
  adaptiveWindow?: number;    // seconds to look back (used when strategy === 'adaptive')
}

export interface ExporterConfig {
  type: 'otlp' | 'jaeger' | 'tempo' | 'zipkin';
  endpoint?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface OTelConfig {
  serviceName: string;
  serviceVersion: string;
  sampling: SamplingConfig;
  exporter: ExporterConfig;
  maxSpans: number;
  correlationIdHeader: string;
}

export interface TraceQuery {
  traceId?: string;
  serviceName?: string;
  spanName?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  status?: SpanStatus;
  since?: string;
  until?: string;
  limit?: number;
}

export interface TraceAggregationResult {
  totalTraces: number;
  totalSpans: number;
  avgDurationMs: number;
  errorRate: number;
  byService: Record<string, { count: number; avgDurationMs: number; errorCount: number }>;
  topSlowTraces: Array<{ traceId: string; durationMs: number; spanCount: number; serviceName: string }>;
}

// ── In-Memory Stores ────────────────────────────────────────────────────────

const traceStore = new Map<string, TraceSpan[]>(); // traceId → spans
const completedTraces = new Map<string, { completedAt: string; spanCount: number }>();
const activeSpans = new Map<string, TraceSpan>();   // spanId → span (still open)
const correlationMap = new Map<string, string>();   // correlationId → traceId
const errorCounter = new Map<string, { count: number; windowStart: number }>();

const DEFAULT_MAX_SPANS = 50_000;
let spanCount = 0;
let config: OTelConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'iassetspro',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  sampling: { strategy: 'always' },
  exporter: { type: 'otlp', endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318' },
  maxSpans: DEFAULT_MAX_SPANS,
  correlationIdHeader: 'x-correlation-id',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function shouldSample(): boolean {
  switch (config.sampling.strategy) {
    case 'always': return true;
    case 'never': return false;
    case 'probability':
      return Math.random() < (config.sampling.probability ?? 1.0);
    case 'adaptive': {
      const window = (config.sampling.adaptiveWindow ?? 300) * 1000;
      const threshold = config.sampling.adaptiveThreshold ?? 10;
      const now = Date.now();
      let recentErrors = 0;
      let recentTotal = 0;
      for (const [, entry] of errorCounter) {
        if (now - entry.windowStart < window) {
          recentErrors += entry.count;
          recentTotal += entry.count;
        }
      }
      if (recentTotal === 0) return true;
      const errorRate = (recentErrors / recentTotal) * 100;
      return errorRate > threshold || Math.random() < 0.5;
    }
    default: return true;
  }
}

function recordErrorForAdaptive(traceId: string): void {
  const now = Date.now();
  const existing = errorCounter.get(traceId);
  if (existing && now - existing.windowStart < 300_000) {
    existing.count++;
  } else {
    errorCounter.set(traceId, { count: 1, windowStart: now });
  }
}

// ── OpenTelemetry Service ──────────────────────────────────────────────────

export const OpenTelemetryService = {
  // ── Configuration ───────────────────────────────────────────────────────

  /**
   * Configure the OpenTelemetry service
   */
  configure(patch: Partial<OTelConfig>): OTelConfig {
    config = { ...config, ...patch };
    logger.info('OpenTelemetry configuration updated', {
      serviceName: config.serviceName,
      samplingStrategy: config.sampling.strategy,
      exporterType: config.exporter.type,
    });
    return { ...config };
  },

  /**
   * Get current configuration
   */
  getConfig(): OTelConfig {
    return { ...config };
  },

  // ── Trace Context Management ────────────────────────────────────────────

  /**
   * Extract or create a TraceContext from request headers
   */
  extractContext(headers: Headers | Record<string, string | string[] | undefined>): TraceContext {
    const get = (name: string): string | undefined => {
      const val = headers instanceof Headers ? headers.get(name) : (headers[name] as string | undefined);
      return typeof val === 'string' ? val : undefined;
    };

    const correlationId = get(config.correlationIdHeader);
    const existingTraceId = correlationId ? correlationMap.get(correlationId) : undefined;

    // Check for W3C traceparent header
    const traceparent = get('traceparent');
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        return {
          traceId: parts[1],
          spanId: generateId(),
          parentId: parts[2],
          traceFlags: parts[3],
        };
      }
    }

    return {
      traceId: existingTraceId || generateId(),
      spanId: generateId(),
    };
  },

  /**
   * Inject trace context into headers for downstream propagation
   */
  injectContext(ctx: TraceContext, headers: Headers | Record<string, string>): void {
    const traceparent = `00-${ctx.traceId}-${ctx.spanId}-01`;
    if (headers instanceof Headers) {
      headers.set('traceparent', traceparent);
      headers.set('x-correlation-id', ctx.traceId);
    } else {
      headers['traceparent'] = traceparent;
      headers['x-correlation-id'] = ctx.traceId;
    }
  },

  /**
   * Propagate correlation ID mapping
   */
  setCorrelation(correlationId: string, traceId: string): void {
    correlationMap.set(correlationId, traceId);
    // Auto-expire after 1 hour
    setTimeout(() => correlationMap.delete(correlationId), 3_600_000).unref();
  },

  getTraceIdByCorrelation(correlationId: string): string | undefined {
    return correlationMap.get(correlationId);
  },

  // ── Span Management ─────────────────────────────────────────────────────

  /**
   * Create a new root span (no parent)
   */
  createRootSpan(name: string, kind: TraceSpan['kind'] = 'server', attributes: Record<string, unknown> = {}): TraceSpan {
    if (!shouldSample()) {
      // Return a no-op span that won't be stored
      return {
        spanId: generateId(),
        traceId: generateId(),
        name,
        kind,
        startTime: new Date().toISOString(),
        status: 'unset',
        attributes,
        events: [],
        serviceName: config.serviceName,
      };
    }

    const span: TraceSpan = {
      spanId: generateId(),
      traceId: generateId(),
      name,
      kind,
      startTime: new Date().toISOString(),
      status: 'unset',
      attributes,
      events: [],
      serviceName: config.serviceName,
    };

    activeSpans.set(span.spanId, span);
    if (!traceStore.has(span.traceId)) {
      traceStore.set(span.traceId, []);
    }
    traceStore.get(span.traceId)!.push(span);
    spanCount++;

    return span;
  },

  /**
   * Create a child span under a parent
   */
  createChildSpan(name: string, parentContext: TraceContext, kind: TraceSpan['kind'] = 'internal', attributes: Record<string, unknown> = {}): TraceSpan {
    const span: TraceSpan = {
      spanId: generateId(),
      traceId: parentContext.traceId,
      parentId: parentContext.spanId,
      name,
      kind,
      startTime: new Date().toISOString(),
      status: 'unset',
      attributes,
      events: [],
      serviceName: config.serviceName,
    };

    activeSpans.set(span.spanId, span);
    if (!traceStore.has(span.traceId)) {
      traceStore.set(span.traceId, []);
    }
    traceStore.get(span.traceId)!.push(span);
    spanCount++;

    return span;
  },

  /**
   * End a span and compute its duration
   */
  endSpan(spanId: string, status: SpanStatus = 'ok', statusMessage?: string): TraceSpan | null {
    const span = activeSpans.get(spanId);
    if (!span) return null;

    const endTime = new Date().toISOString();
    span.endTime = endTime;
    span.status = status;
    span.statusMessage = statusMessage;
    span.durationMs = new Date(endTime).getTime() - new Date(span.startTime).getTime();

    activeSpans.delete(spanId);

    if (status === 'error') {
      recordErrorForAdaptive(span.traceId);
    }

    // Enforce max spans limit
    if (spanCount > config.maxSpans) {
      const oldestKey = traceStore.keys().next().value;
      if (oldestKey) {
        const removed = traceStore.get(oldestKey)?.length ?? 0;
        traceStore.delete(oldestKey);
        completedTraces.delete(oldestKey);
        spanCount -= removed;
      }
    }

    // Mark trace as completed if no more active spans for this trace
    const traceSpans = traceStore.get(span.traceId) || [];
    const hasActive = traceSpans.some(s => !s.endTime);
    if (!hasActive) {
      completedTraces.set(span.traceId, {
        completedAt: endTime,
        spanCount: traceSpans.length,
      });
    }

    return span;
  },

  /**
   * Annotate a span with attributes
   */
  setSpanAttributes(spanId: string, attributes: Record<string, unknown>): void {
    const span = activeSpans.get(spanId);
    if (span) {
      Object.assign(span.attributes, attributes);
    }
  },

  /**
   * Add an event to a span
   */
  addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = activeSpans.get(spanId);
    if (span) {
      span.events.push({
        name,
        timestamp: new Date().toISOString(),
        attributes,
      });
    }
  },

  /**
   * Record an error on a span
   */
  recordSpanError(spanId: string, error: Error): void {
    const span = activeSpans.get(spanId);
    if (span) {
      span.status = 'error';
      span.statusMessage = error.message;
      span.events.push({
        name: 'exception',
        timestamp: new Date().toISOString(),
        attributes: {
          'exception.type': error.name,
          'exception.message': error.message,
          'exception.stacktrace': error.stack,
        },
      });
    }
  },

  // ── Custom Instrumentation ──────────────────────────────────────────────

  /**
   * Instrument an async function with tracing
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    parentContext?: TraceContext,
    attributes?: Record<string, unknown>,
  ): Promise<T> {
    const span = parentContext
      ? this.createChildSpan(name, parentContext, 'internal', attributes)
      : this.createRootSpan(name, 'internal', attributes);

    try {
      const result = await fn();
      this.endSpan(span.spanId, 'ok');
      return result;
    } catch (error) {
      this.recordSpanError(span.spanId, error instanceof Error ? error : new Error(String(error)));
      this.endSpan(span.spanId, 'error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  /**
   * Wrap an API handler with tracing instrumentation
   */
  instrumentApiRoute(routePath: string, parentContext?: TraceContext): TraceContext {
    const ctx = parentContext || this.extractContext({});
    this.createChildSpan(
      `GET ${routePath}`,
      ctx,
      'server',
      {
        'http.route': routePath,
        'http.method': 'GET',
        'service.name': config.serviceName,
      },
    );
    return ctx;
  },

  // ── Trace Query API ─────────────────────────────────────────────────────

  /**
   * Query traces from the store
   */
  queryTraces(query: TraceQuery): { traces: TraceSpan[]; total: number } {
    const {
      traceId, serviceName, spanName, minDurationMs, maxDurationMs,
      status, since, until, limit = 50,
    } = query;

    let allSpans: TraceSpan[] = [];

    if (traceId) {
      allSpans = traceStore.get(traceId) || [];
    } else {
      for (const spans of traceStore.values()) {
        allSpans.push(...spans);
      }
    }

    // Filter
    if (serviceName) {
      allSpans = allSpans.filter(s => s.serviceName === serviceName);
    }
    if (spanName) {
      allSpans = allSpans.filter(s => s.name.includes(spanName));
    }
    if (minDurationMs !== undefined) {
      allSpans = allSpans.filter(s => s.durationMs !== undefined && s.durationMs >= minDurationMs);
    }
    if (maxDurationMs !== undefined) {
      allSpans = allSpans.filter(s => s.durationMs !== undefined && s.durationMs <= maxDurationMs);
    }
    if (status) {
      allSpans = allSpans.filter(s => s.status === status);
    }
    if (since) {
      allSpans = allSpans.filter(s => s.startTime >= since);
    }
    if (until) {
      allSpans = allSpans.filter(s => s.startTime <= until);
    }

    // Sort by start time descending
    allSpans.sort((a, b) => b.startTime.localeCompare(a.startTime));

    const total = allSpans.length;
    return { traces: allSpans.slice(0, limit), total };
  },

  /**
   * Get a single complete trace by traceId
   */
  getTrace(traceId: string): TraceSpan[] | null {
    const spans = traceStore.get(traceId);
    if (!spans || spans.length === 0) return null;
    return spans.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  // ── Aggregation ─────────────────────────────────────────────────────────

  /**
   * Aggregate trace statistics
   */
  getAggregation(query?: { since?: string; until?: string }): TraceAggregationResult {
    let allSpans: TraceSpan[] = [];
    const traceIds = new Set<string>();

    for (const [traceId, spans] of traceStore.entries()) {
      const completedSpan = spans[0];
      if (query?.since && completedSpan.startTime < query.since) continue;
      if (query?.until && completedSpan.startTime > query.until) continue;
      allSpans.push(...spans);
      traceIds.add(traceId);
    }

    const totalSpans = allSpans.length;
    const completedSpans = allSpans.filter(s => s.endTime);
    const errorSpans = allSpans.filter(s => s.status === 'error');
    const durations = completedSpans.map(s => s.durationMs ?? 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // By service
    const byService: Record<string, { count: number; avgDurationMs: number; errorCount: number }> = {};
    for (const span of allSpans) {
      if (!byService[span.serviceName]) {
        byService[span.serviceName] = { count: 0, avgDurationMs: 0, errorCount: 0 };
      }
      byService[span.serviceName].count++;
      if (span.status === 'error') byService[span.serviceName].errorCount++;
    }

    // Compute avg duration per service
    for (const svc of Object.values(byService)) {
      const svcDurations = allSpans
        .filter(s => s.serviceName === Object.keys(byService).find(k => byService[k] === svc))
        .map(s => s.durationMs ?? 0);
      svc.avgDurationMs = svcDurations.length > 0
        ? Math.round(svcDurations.reduce((a, b) => a + b, 0) / svcDurations.length * 100) / 100
        : 0;
    }

    // Top slow traces
    const traceDurations: Array<{ traceId: string; durationMs: number; spanCount: number; serviceName: string }> = [];
    for (const [tid, spans] of traceStore.entries()) {
      const rootSpan = spans.find(s => !s.parentId) || spans[0];
      const totalDuration = spans.reduce((max, s) => Math.max(max, s.durationMs ?? 0), 0);
      traceDurations.push({
        traceId: tid,
        durationMs: totalDuration,
        spanCount: spans.length,
        serviceName: rootSpan?.serviceName || config.serviceName,
      });
    }
    traceDurations.sort((a, b) => b.durationMs - a.durationMs);

    return {
      totalTraces: traceIds.size,
      totalSpans,
      avgDurationMs: Math.round(avgDuration * 100) / 100,
      errorRate: totalSpans > 0 ? Math.round((errorSpans.length / totalSpans) * 10000) / 100 : 0,
      byService,
      topSlowTraces: traceDurations.slice(0, 10),
    };
  },

  /**
   * Get active span count and store statistics
   */
  getStats(): {
    activeSpans: number;
    totalTraces: number;
    totalSpans: number;
    completedTraces: number;
    storeSizeBytes: number;
    samplingStrategy: SamplingStrategy;
  } {
    let storedSpans = 0;
    for (const spans of traceStore.values()) {
      storedSpans += spans.length;
    }

    return {
      activeSpans: activeSpans.size,
      totalTraces: traceStore.size,
      totalSpans: storedSpans,
      completedTraces: completedTraces.size,
      storeSizeBytes: Math.round(storedSpans * 0.5), // rough estimate
      samplingStrategy: config.sampling.strategy,
    };
  },

  /**
   * Clear all trace data
   */
  clear(): void {
    traceStore.clear();
    completedTraces.clear();
    activeSpans.clear();
    correlationMap.clear();
    errorCounter.clear();
    spanCount = 0;
    logger.info('Trace store cleared');
  },
};
