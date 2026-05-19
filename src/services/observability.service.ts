// ============================================================================
// OBSERVABILITY SERVICE — System metrics, distributed tracing, error monitoring
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('observability');

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
  unit?: string;
}

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  source: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  userId?: string;
  requestId?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface SpanTrace {
  traceId: string;
  spans: Array<{
    id: string;
    parentId?: string;
    name: string;
    start: string;
    end: string;
    durationMs: number;
    service: string;
    status: 'ok' | 'error';
    tags: Record<string, string>;
    metadata?: Record<string, unknown>;
  }>;
}

export interface SystemSnapshot {
  timestamp: string;
  uptime: number;
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number; externalMB: number };
  cpu: { loadAvg: number[] };
  eventLoop: { lagMs: number };
  activeConnections: number;
  pendingRequests: number;
  queueSize: number;
}

// In-memory metrics store
const metricsBuffer: MetricPoint[] = [];
const MAX_METRICS = 10000;
const errorBuffer: ErrorEvent[] = [];
const MAX_ERRORS = 1000;

export class ObservabilityService {
  /**
   * Record a metric data point
   */
  static recordMetric(name: string, value: number, tags: Record<string, string> = {}, unit?: string): void {
    metricsBuffer.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      unit,
    });

    // Trim oldest if over limit
    while (metricsBuffer.length > MAX_METRICS) metricsBuffer.shift();
  }

  /**
   * Record an error event
   */
  static recordError(error: {
    message: string;
    stack?: string;
    source: string;
    severity?: ErrorEvent['severity'];
    userId?: string;
    requestId?: string;
    context?: Record<string, unknown>;
  }): ErrorEvent {
    const event: ErrorEvent = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message: error.message,
      stack: error.stack,
      source: error.source,
      severity: error.severity || 'error',
      userId: error.userId,
      requestId: error.requestId,
      context: error.context,
      timestamp: new Date().toISOString(),
    };

    errorBuffer.push(event);
    while (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();

    // Also log to structured logger
    const logFn = event.severity === 'fatal' ? logger.fatal.bind(logger)
      : event.severity === 'error' ? logger.error.bind(logger)
      : logger.warn.bind(logger);

    logFn(`[${event.source}] ${event.message}`, { eventId: event.id, severity: event.severity });

    return event;
  }

  /**
   * Get recent metrics
   */
  static getMetrics(name?: string, since?: string, limit = 100): MetricPoint[] {
    let filtered = [...metricsBuffer];

    if (name) filtered = filtered.filter(m => m.name === name);
    if (since) filtered = filtered.filter(m => m.timestamp >= since);

    return filtered.slice(-limit);
  }

  /**
   * Get recent errors
   */
  static getErrors(severity?: string, since?: string, limit = 50): ErrorEvent[] {
    let filtered = [...errorBuffer];

    if (severity) filtered = filtered.filter(e => e.severity === severity);
    if (since) filtered = filtered.filter(e => e.timestamp >= since);

    return filtered.slice(-limit);
  }

  /**
   * Get system snapshot
   */
  static getSystemSnapshot(): SystemSnapshot {
    const mem = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        externalMB: Math.round(mem.external / 1024 / 1024),
      },
      cpu: { loadAvg: process.cpuUsage ? [0, 0, 0] : [] },
      eventLoop: { lagMs: 0 }, // Would need perf_hooks in production
      activeConnections: 0,
      pendingRequests: 0,
      queueSize: 0,
    };
  }

  /**
   * Get error rate statistics
   */
  static getErrorStats(hours: number = 24): {
    total: number;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
    errorRate: number;
  } {
    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const recent = errorBuffer.filter(e => e.timestamp >= since);

    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const e of recent) {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      bySource[e.source] = (bySource[e.source] || 0) + 1;
    }

    const hoursSinceHours = Math.max(1, hours);
    return {
      total: recent.length,
      bySeverity,
      bySource,
      errorRate: Math.round(recent.length / hoursSinceHours * 100) / 100,
    };
  }

  /**
   * Get dashboard summary
   */
  static async getDashboard(): Promise<{
    system: SystemSnapshot;
    errorStats: ReturnType<typeof ObservabilityService.getErrorStats>;
    topErrors: ErrorEvent[];
    topMetrics: Array<{ name: string; latest: number; avg: number; count: number }>;
  }> {
    const system = this.getSystemSnapshot();
    const errorStats = this.getErrorStats(24);
    const topErrors = this.getErrors(undefined, undefined, 10);

    // Aggregate top metrics
    const metricNames = [...new Set(metricsBuffer.map(m => m.name))].slice(0, 20);
    const topMetrics = metricNames.map(name => {
      const points = metricsBuffer.filter(m => m.name === name).slice(-20);
      const values = points.map(p => p.value);
      return {
        name,
        latest: values[values.length - 1] || 0,
        avg: values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 100) / 100 : 0,
        count: points.length,
      };
    });

    return { system, errorStats, topErrors, topMetrics };
  }
}
