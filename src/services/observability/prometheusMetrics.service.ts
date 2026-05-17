// ============================================================================
// PROMETHEUS METRICS SERVICE — Counter, Gauge, Histogram, Summary; exposition
// ============================================================================

import { createLogger } from '@/lib/logger';

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

  // ── Operations ──────────────────────────────────────────────────────────

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

  // ── Prometheus Text Format Exposition ───────────────────────────────────

  /**
   * Render all metrics in Prometheus text exposition format
   */
  async exposition(): Promise<string> {
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

    // ── System Metrics ──
    this.registerGauge('db_connections_active', 'Active database connections', []);
    this.registerGauge('db_connections_pool_size', 'Database connection pool size', []);
    this.registerGauge('db_query_duration_seconds', 'Database query duration', ['operation']);
    this.registerCounter('db_queries_total', 'Total database queries', ['operation', 'model']);
    this.registerGauge('redis_hit_rate', 'Redis cache hit rate (0-1)', []);
    this.registerCounter('redis_operations_total', 'Total Redis operations', ['operation', 'result']);
    this.registerGauge('queue_depth', 'Job queue depth', ['queue_name']);
    this.registerCounter('queue_jobs_total', 'Total jobs processed', ['queue_name', 'status']);
    this.registerGauge('process_cpu_usage', 'Process CPU usage ratio (0-1)', []);
    this.registerGauge('process_memory_bytes', 'Process memory usage in bytes', ['type']);
    this.registerGauge('process_uptime_seconds', 'Process uptime in seconds', []);

    logger.info('Built-in metrics bootstrapped (16 metric families)');
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
    logger.info('All metrics cleared');
  },
};

// ── Auto-bootstrap on import ────────────────────────────────────────────────
PrometheusMetricsService.bootstrap();
