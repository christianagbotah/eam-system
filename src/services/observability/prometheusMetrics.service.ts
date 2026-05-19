// ============================================================================
// PROMETHEUS METRICS SERVICE — Counter, Gauge, Histogram, Summary; exposition
// ============================================================================

import { createLogger } from '@/lib/logger';
import { cache } from '@/lib/cache';

const logger = createLogger('prometheusMetrics');

// ── Metric Types ────────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricLabelValues {
  [key: string]: string;
}

interface BaseMetric {
  name: string;
  help: string;
  type: MetricType;
  labels: string[];              // allowed label keys
  createdAt: string;
}

interface CounterValue extends BaseMetric {
  type: 'counter';
  values: Map<string, number>;   // labelSetKey → value
}

interface GaugeValue extends BaseMetric {
  type: 'gauge';
  values: Map<string, number>;   // labelSetKey → value
}

interface HistogramValue extends BaseMetric {
  type: 'histogram';
  buckets: number[];             // explicit bucket boundaries
  values: Map<string, { sum: number; count: number; buckets: Record<number, number> }>;
}

interface SummaryValue extends BaseMetric {
  type: 'summary';
  maxAgeSeconds: number;
  values: Map<string, { sum: number; count: number; quantiles: Map<number, number>; observations: Array<{ value: number; timestamp: number }> }>;
}

type MetricRecord = CounterValue | GaugeValue | HistogramValue | SummaryValue;

// ── Internal tracking counters for high-level methods ────────────────────────

let cacheHits = 0;
let cacheMisses = 0;

// ── Label Set Key ───────────────────────────────────────────────────────────

function labelSetKey(labels: MetricLabelValues): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

function escapeLabelValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function sanitizeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:]/g, '_').replace(/^[^a-zA-Z_:]/, '_');
}

// ── In-Memory Metric Store ──────────────────────────────────────────────────

const metricsStore = new Map<string, MetricRecord>();

// ── Prometheus Metrics Service ──────────────────────────────────────────────

export const PrometheusMetricsService = {
  // ── Registration ────────────────────────────────────────────────────────

  /**
   * Register a Counter metric
   */
  registerCounter(name: string, help: string, labels: string[] = []): void {
    const key = sanitizeMetricName(name);
    if (metricsStore.has(key)) {
      logger.warn(`Metric already registered: ${key}`);
      return;
    }
    metricsStore.set(key, {
      name: key,
      help,
      type: 'counter',
      labels,
      values: new Map(),
      createdAt: new Date().toISOString(),
    });
    logger.info(`Registered counter: ${key}`);
  },

  /**
   * Register a Gauge metric
   */
  registerGauge(name: string, help: string, labels: string[] = []): void {
    const key = sanitizeMetricName(name);
    if (metricsStore.has(key)) {
      logger.warn(`Metric already registered: ${key}`);
      return;
    }
    metricsStore.set(key, {
      name: key,
      help,
      type: 'gauge',
      labels,
      values: new Map(),
      createdAt: new Date().toISOString(),
    });
    logger.info(`Registered gauge: ${key}`);
  },

  /**
   * Register a Histogram metric
   */
  registerHistogram(name: string, help: string, buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], labels: string[] = []): void {
    const key = sanitizeMetricName(name);
    if (metricsStore.has(key)) {
      logger.warn(`Metric already registered: ${key}`);
      return;
    }
    const sortedBuckets = [...buckets].sort((a, b) => a - b);
    metricsStore.set(key, {
      name: key,
      help,
      type: 'histogram',
      labels,
      buckets: sortedBuckets,
      values: new Map(),
      createdAt: new Date().toISOString(),
    });
    logger.info(`Registered histogram: ${key}`);
  },

  /**
   * Register a Summary metric
   */
  registerSummary(name: string, help: string, quantiles: number[] = [0.5, 0.9, 0.95, 0.99], maxAgeSeconds: number = 600, labels: string[] = []): void {
    const key = sanitizeMetricName(name);
    if (metricsStore.has(key)) {
      logger.warn(`Metric already registered: ${key}`);
      return;
    }
    const quantileMap = new Map<number, number>();
    for (const q of quantiles) quantileMap.set(q, 0);

    metricsStore.set(key, {
      name: key,
      help,
      type: 'summary',
      labels,
      maxAgeSeconds,
      values: new Map(),
      createdAt: new Date().toISOString(),
    } as SummaryValue);

    // Initialize summary values
    const metric = metricsStore.get(key) as SummaryValue;
    metric.values.set('', {
      sum: 0,
      count: 0,
      quantiles: quantileMap,
      observations: [],
    });

    logger.info(`Registered summary: ${key}`);
  },

  // ── Low-Level Operations ────────────────────────────────────────────────

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels: MetricLabelValues = {}): void {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key) as CounterValue | undefined;
    if (!metric || metric.type !== 'counter') return;
    if (value < 0) {
      logger.warn(`Counter cannot be decremented: ${key}`);
      return;
    }

    const lk = labelSetKey(labels);
    const current = metric.values.get(lk) || 0;
    metric.values.set(lk, current + value);
  },

  /**
   * Set or update a gauge
   */
  setGauge(name: string, value: number, labels: MetricLabelValues = {}): void {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key) as GaugeValue | undefined;
    if (!metric || metric.type !== 'gauge') return;

    const lk = labelSetKey(labels);
    metric.values.set(lk, value);
  },

  /**
   * Increment a gauge (positive or negative)
   */
  incrementGauge(name: string, value: number, labels: MetricLabelValues = {}): void {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key) as GaugeValue | undefined;
    if (!metric || metric.type !== 'gauge') return;

    const lk = labelSetKey(labels);
    const current = metric.values.get(lk) || 0;
    metric.values.set(lk, current + value);
  },

  /**
   * Record a histogram observation
   */
  observeHistogram(name: string, value: number, labels: MetricLabelValues = {}): void {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key) as HistogramValue | undefined;
    if (!metric || metric.type !== 'histogram') return;

    const lk = labelSetKey(labels);
    let entry = metric.values.get(lk);
    if (!entry) {
      entry = { sum: 0, count: 0, buckets: {} };
      for (const b of metric.buckets) {
        entry.buckets[b] = 0;
      }
      entry.buckets['+Inf'] = 0;
      metric.values.set(lk, entry);
    }

    entry.sum += value;
    entry.count++;

    for (const b of metric.buckets) {
      if (value <= b) {
        entry.buckets[b]++;
      }
    }
    entry.buckets['+Inf']++;
  },

  /**
   * Record a summary observation
   */
  observeSummary(name: string, value: number, labels: MetricLabelValues = {}): void {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key) as SummaryValue | undefined;
    if (!metric || metric.type !== 'summary') return;

    const lk = labelSetKey(labels);
    let entry = metric.values.get(lk);
    if (!entry) {
      const qMap = new Map<number, number>();
      qMap.set(0.5, 0);
      qMap.set(0.9, 0);
      qMap.set(0.95, 0);
      qMap.set(0.99, 0);
      entry = { sum: 0, count: 0, quantiles: qMap, observations: [] };
      metric.values.set(lk, entry);
    }

    entry.sum += value;
    entry.count++;
    entry.observations.push({ value, timestamp: Date.now() });

    // Evict old observations
    const cutoff = Date.now() - (metric.maxAgeSeconds * 1000);
    while (entry.observations.length > 0 && entry.observations[0].timestamp < cutoff) {
      entry.observations.shift();
    }

    // Recalculate quantiles
    const sorted = [...entry.observations].map(o => o.value).sort((a, b) => a - b);
    for (const [q] of entry.quantiles) {
      const idx = Math.min(Math.floor(q * sorted.length), sorted.length - 1);
      entry.quantiles.set(q, sorted.length > 0 ? sorted[idx] : 0);
    }
  },

  // ── Read Operations ─────────────────────────────────────────────────────

  /**
   * Get metric value(s)
   */
  getMetric(name: string): { metric: BaseMetric; values: Record<string, number | Record<string, number>> } | null {
    const key = sanitizeMetricName(name);
    const metric = metricsStore.get(key);
    if (!metric) return null;

    const values: Record<string, number | Record<string, number>> = {};
    for (const [lk, v] of metric.values) {
      if (typeof v === 'number') {
        values[lk || '(none)'] = v;
      } else if ('buckets' in v) {
        // histogram
        values[lk || '(none)'] = { ...v.buckets, _count: v.count, _sum: v.sum } as unknown as Record<string, number>;
      } else if ('quantiles' in v) {
        // summary
        const qObj: Record<string, number> = {};
        qObj._count = v.count;
        qObj._sum = v.sum;
        for (const [q, val] of v.quantiles) {
          qObj[`p${Math.round(q * 100)}`] = val;
        }
        values[lk || '(none)'] = qObj as unknown as Record<string, number>;
      }
    }

    return { metric, values };
  },

  /**
   * List all registered metrics
   */
  listMetrics(): Array<{ name: string; type: MetricType; help: string; labelCount: number; valueCount: number }> {
    const result: Array<{ name: string; type: MetricType; help: string; labelCount: number; valueCount: number }> = [];
    for (const m of metricsStore.values()) {
      result.push({
        name: m.name,
        type: m.type,
        help: m.help,
        labelCount: m.labels.length,
        valueCount: m.values.size,
      });
    }
    return result;
  },

  // ── High-Level Instrumentation Methods ─────────────────────────────────

  /**
   * Record an API request — updates http_requests_total, http_request_duration_seconds, http_errors_total
   * @param durationMs - Request duration in milliseconds
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - API path (e.g. /api/work-orders)
   * @param statusCode - HTTP status code
   */
  recordApiRequest(durationMs: number, method: string, path: string, statusCode: number): void {
    const normalizedPath = normalizePath(path);
    const statusStr = String(statusCode);
    const durationSeconds = durationMs / 1000;

    // Counter: total requests by method, endpoint, status
    this.incrementCounter('http_requests_total', 1, { method, endpoint: normalizedPath, status: statusStr });

    // Histogram: request duration by method and endpoint
    this.observeHistogram('http_request_duration_seconds', durationSeconds, { method, endpoint: normalizedPath });

    // Counter: errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', 1, { method, endpoint: normalizedPath, status_code: statusStr });
    }
  },

  /**
   * Record a database query — updates db_queries_total and db_query_duration_seconds
   * @param durationMs - Query duration in milliseconds
   * @param operation - Operation type (findMany, create, update, delete, raw, etc.)
   * @param model - Optional Prisma model name (WorkOrder, User, etc.)
   */
  recordDbQuery(durationMs: number, operation: string, model?: string): void {
    const durationSeconds = durationMs / 1000;
    const safeModel = model || 'unknown';

    // Counter: total queries by operation and model
    this.incrementCounter('db_queries_total', 1, { operation, model: safeModel });

    // Gauge: latest query duration (not cumulative — shows last observation per operation)
    this.setGauge('db_query_duration_seconds', durationSeconds, { operation });
  },

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    cacheHits++;
    this.incrementCounter('cache_operations_total', 1, { result: 'hit' });
  },

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    cacheMisses++;
    this.incrementCounter('cache_operations_total', 1, { result: 'miss' });
  },

  /**
   * Set the number of active WebSocket connections
   * @param count - Current number of active WebSocket sessions
   */
  setWebSocketSessions(count: number): void {
    this.setGauge('websocket_sessions_active', count);
  },

  /**
   * Increment WebSocket sessions (e.g. on connect)
   */
  incrementWebSocketSessions(): void {
    this.incrementGauge('websocket_sessions_active', 1);
  },

  /**
   * Decrement WebSocket sessions (e.g. on disconnect)
   */
  decrementWebSocketSessions(): void {
    this.incrementGauge('websocket_sessions_active', -1);
  },

  /**
   * Set the queue depth for a named queue
   * @param queueName - Name of the queue
   * @param depth - Current depth (number of pending jobs)
   */
  setQueueDepth(queueName: string, depth: number): void {
    this.setGauge('queue_depth', depth, { queue_name: queueName });
  },

  /**
   * Record a processed queue job
   * @param queueName - Name of the queue
   * @param status - Job result (completed, failed, retry)
   */
  recordQueueJob(queueName: string, status: string): void {
    this.incrementCounter('queue_jobs_total', 1, { queue_name: queueName, status });
  },

  /**
   * Get current cache hit/miss ratio (0-1)
   */
  getCacheHitRate(): number {
    const total = cacheHits + cacheMisses;
    if (total === 0) return 0;
    return cacheHits / total;
  },

  // ── Auto-collected Process Metrics ─────────────────────────────────────

  /**
   * Collect and update process-level gauges (called during exposition)
   */
  collectProcessMetrics(): void {
    // Uptime
    this.setGauge('process_uptime_seconds', process.uptime());

    // Memory
    const mem = process.memoryUsage();
    this.setGauge('process_memory_bytes', mem.rss, { type: 'rss' });
    this.setGauge('process_memory_bytes', mem.heapUsed, { type: 'heap_used' });
    this.setGauge('process_memory_bytes', mem.heapTotal, { type: 'heap_total' });
    this.setGauge('process_memory_bytes', mem.external, { type: 'external' });

    // Cache stats from the in-memory cache
    const stats = cache.getStats();
    this.setGauge('cache_entries', stats.entries);
    this.setGauge('cache_hit_rate', stats.hitRate / 100); // convert percentage to 0-1 ratio
    this.setGauge('cache_total_hits', stats.totalHits);
  },

  // ── Prometheus Text Format Exposition ───────────────────────────────────

  /**
   * Render all metrics in Prometheus text exposition format.
   * Auto-collects process metrics before rendering.
   */
  async exposition(): Promise<string> {
    // Collect volatile metrics before exposition
    this.collectProcessMetrics();

    const lines: string[] = [];

    for (const metric of metricsStore.values()) {
      // HELP line
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      // TYPE line
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter') {
        for (const [lk, value] of metric.values) {
          const labelStr = lk ? `{${lk}}` : '';
          lines.push(`${metric.name}${labelStr} ${value}`);
        }
      } else if (metric.type === 'gauge') {
        for (const [lk, value] of metric.values) {
          const labelStr = lk ? `{${lk}}` : '';
          lines.push(`${metric.name}${labelStr} ${value}`);
        }
      } else if (metric.type === 'histogram') {
        const histogram = metric as HistogramValue;
        for (const [lk, entry] of histogram.values) {
          const baseLabel = lk ? `${lk},` : '';
          // Bucket lines
          for (const bucket of histogram.buckets) {
            lines.push(`${metric.name}_bucket{${baseLabel}le="${bucket}"} ${entry.buckets[bucket]}`);
          }
          lines.push(`${metric.name}_bucket{${baseLabel}le="+Inf"} ${entry.buckets['+Inf']}`);
          lines.push(`${metric.name}_sum{${baseLabel.slice(0, -1)}} ${entry.sum}`);
          lines.push(`${metric.name}_count{${baseLabel.slice(0, -1)}} ${entry.count}`);
        }
      } else if (metric.type === 'summary') {
        const summary = metric as SummaryValue;
        for (const [lk, entry] of summary.values) {
          const baseLabel = lk ? `${lk},` : '';
          // Quantile lines
          for (const [q, val] of entry.quantiles) {
            lines.push(`${metric.name}{${baseLabel}quantile="${q}"} ${val}`);
          }
          const cleanedBase = baseLabel.slice(0, -1);
          lines.push(`${metric.name}_sum{${cleanedBase}} ${entry.sum}`);
          lines.push(`${metric.name}_count{${cleanedBase}} ${entry.count}`);
        }
      }

      lines.push(''); // blank line between metrics
    }

    return lines.join('\n');
  },

  // ── Built-in Application Metrics Bootstrap ──────────────────────────────

  /**
   * Register all built-in iAssetsPro application, business, and system metrics
   */
  bootstrap(): void {
    // ── Application Metrics ──
    this.registerCounter('http_requests_total', 'Total HTTP requests received', ['method', 'endpoint', 'status']);
    this.registerHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], ['method', 'endpoint']);
    this.registerCounter('http_errors_total', 'Total HTTP error responses', ['method', 'endpoint', 'status_code']);

    // ── Business Metrics ──
    this.registerCounter('work_orders_created_total', 'Total work orders created', ['priority', 'type']);
    this.registerGauge('work_orders_open', 'Currently open work orders', ['priority']);
    this.registerCounter('pm_compliance_total', 'PM compliance checks', ['compliance_status']);
    this.registerGauge('mttr_hours', 'Mean time to repair in hours', ['department']);
    this.registerCounter('alarms_triggered_total', 'Total alarms triggered', ['severity', 'source']);
    this.registerGauge('alarms_active', 'Currently active alarms', ['severity']);
    this.registerCounter('maintenance_requests_total', 'Total maintenance requests', ['status']);
    this.registerHistogram('wo_completion_hours', 'Work order completion time in hours', [1, 2, 4, 8, 12, 24, 48, 72, 168], ['type', 'priority']);

    // ── Database Metrics ──
    this.registerGauge('db_connections_active', 'Active database connections', []);
    this.registerGauge('db_connections_pool_size', 'Database connection pool size', []);
    this.registerGauge('db_query_duration_seconds', 'Latest database query duration in seconds', ['operation']);
    this.registerCounter('db_queries_total', 'Total database queries', ['operation', 'model']);

    // ── Cache Metrics ──
    this.registerGauge('cache_entries', 'Number of entries in the in-memory cache', []);
    this.registerGauge('cache_hit_rate', 'Cache hit rate (0-1)', []);
    this.registerGauge('cache_total_hits', 'Total cache hits', []);
    this.registerCounter('cache_operations_total', 'Total cache operations', ['result']);

    // ── Queue Metrics ──
    this.registerGauge('queue_depth', 'Job queue depth', ['queue_name']);
    this.registerCounter('queue_jobs_total', 'Total jobs processed', ['queue_name', 'status']);

    // ── WebSocket Metrics ──
    this.registerGauge('websocket_sessions_active', 'Currently active WebSocket sessions', []);

    // ── Process Metrics ──
    this.registerGauge('process_cpu_usage', 'Process CPU usage ratio (0-1)', []);
    this.registerGauge('process_memory_bytes', 'Process memory usage in bytes', ['type']);
    this.registerGauge('process_uptime_seconds', 'Process uptime in seconds', []);

    logger.info('Built-in metrics bootstrapped (21 metric families)');
  },

  // ── Cleanup ─────────────────────────────────────────────────────────────

  /**
   * Remove a metric from the registry
   */
  unregister(name: string): boolean {
    const key = sanitizeMetricName(name);
    return metricsStore.delete(key);
  },

  /**
   * Clear all registered metrics and values
   */
  clear(): void {
    metricsStore.clear();
    cacheHits = 0;
    cacheMisses = 0;
    logger.info('All metrics cleared');
  },
};

// ── Path Normalization ───────────────────────────────────────────────────────

/**
 * Normalize an API path for Prometheus labels by replacing dynamic segments
 * with placeholders. E.g. /api/work-orders/abc123 → /api/work-orders/:id
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9a-f]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

// ── Auto-bootstrap on import ────────────────────────────────────────────────
PrometheusMetricsService.bootstrap();
