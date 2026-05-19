// ============================================================================
// CENTRALIZED LOGGING SERVICE — Structured logs, correlation, anomaly detection
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('centralizedLogging');

// ── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: string;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    userId?: string;
    username?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  details?: Record<string, unknown>;
  result: 'success' | 'failure';
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
}

export interface LogQuery {
  level?: LogLevel;
  service?: string;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  context?: string;
  messagePattern?: string;
  since?: string;
  until?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface LogSearchResult {
  entries: StructuredLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface LogAnomalyEvent {
  id: string;
  detectedAt: string;
  type: 'error_spike' | 'latency_spike' | 'volume_spike' | 'novel_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metric: string;
  baseline: number;
  observed: number;
  windowStart: string;
  windowEnd: string;
  affectedServices: string[];
}

export interface LogRetentionConfig {
  defaultRetentionHours: number;
  levelRetention: Partial<Record<LogLevel, number>>; // hours per level
  maxEntries: number;
  rotationCheckIntervalMs: number;
}

export interface LogStats {
  totalEntries: number;
  byLevel: Record<LogLevel, number>;
  byService: Record<string, number>;
  byHour: Array<{ hour: string; count: number; errors: number }>;
  errorRate: number;
  anomalies: LogAnomalyEvent[];
}

// ── In-Memory Stores ────────────────────────────────────────────────────────

const logBuffer: StructuredLogEntry[] = [];
const auditTrail: AuditTrailEntry[] = [];
const anomalyEvents: LogAnomalyEvent[] = [];

let currentMinLevel: LogLevel = process.env.LOG_LEVEL as LogLevel || 'debug';

const retentionConfig: LogRetentionConfig = {
  defaultRetentionHours: 168, // 7 days
  levelRetention: {
    trace: 24,
    debug: 48,
    info: 168,
    warn: 336,
    error: 720,
    fatal: 2160,
  },
  maxEntries: 100_000,
  rotationCheckIntervalMs: 60_000,
};

let rotationTimer: NodeJS.Timeout | null = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentMinLevel];
}

function trimBuffer(): void {
  const max = retentionConfig.maxEntries;
  while (logBuffer.length > max) {
    logBuffer.shift();
  }
}

// ── Error Spike Detection ───────────────────────────────────────────────────

const errorWindow = new Map<string, number[]>();
const ERROR_WINDOW_MS = 60_000; // 1-minute windows
const ERROR_SPIKE_THRESHOLD = 3; // 3x above baseline

function detectErrorSpike(entry: StructuredLogEntry): void {
  if (entry.level !== 'error' && entry.level !== 'fatal') return;

  const now = Date.now();
  const service = entry.service || 'unknown';

  if (!errorWindow.has(service)) {
    errorWindow.set(service, []);
  }
  const window = errorWindow.get(service)!;
  window.push(now);

  // Clean old entries
  const cutoff = now - ERROR_WINDOW_MS;
  while (window.length > 0 && window[0] < cutoff) {
    window.shift();
  }

  // Compute baseline (average of last 5 windows via rolling approximation)
  if (window.length > 10) {
    // Rough spike detection: if we see more than ERROR_SPIKE_THRESHOLD * expected in the window
    const expected = 5; // baseline ~5 errors per minute
    if (window.length > expected * ERROR_SPIKE_THRESHOLD) {
      const anomaly: LogAnomalyEvent = {
        id: `anomaly-${Date.now()}`,
        detectedAt: new Date().toISOString(),
        type: 'error_spike',
        severity: window.length > expected * 10 ? 'critical' : 'high',
        description: `Error spike detected for service "${service}": ${window.length} errors in the last minute (baseline ~${expected})`,
        metric: 'error_count',
        baseline: expected,
        observed: window.length,
        windowStart: new Date(cutoff).toISOString(),
        windowEnd: new Date().toISOString(),
        affectedServices: [service],
      };
      anomalyEvents.push(anomaly);
      logger.warn('Log anomaly detected', { type: 'error_spike', service, observed: window.length });

      // Cap anomaly events
      while (anomalyEvents.length > 500) {
        anomalyEvents.shift();
      }
    }
  }
}

// ── Centralized Logging Service ─────────────────────────────────────────────

export const CentralizedLoggingService = {
  // ── Log Level Management ────────────────────────────────────────────────

  /**
   * Get the current minimum log level
   */
  getMinLevel(): LogLevel {
    return currentMinLevel;
  },

  /**
   * Set the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    currentMinLevel = level;
    logger.info(`Log level changed to: ${level}`);
  },

  /**
   * Get the retention configuration
   */
  getRetentionConfig(): LogRetentionConfig {
    return { ...retentionConfig };
  },

  /**
   * Update retention configuration
   */
  setRetentionConfig(patch: Partial<LogRetentionConfig>): LogRetentionConfig {
    Object.assign(retentionConfig, patch);
    logger.info('Retention config updated', { ...retentionConfig });
    return { ...retentionConfig };
  },

  // ── Logging ─────────────────────────────────────────────────────────────

  /**
   * Log a structured entry
   */
  log(entry: {
    level: LogLevel;
    message: string;
    service?: string;
    context?: string;
    traceId?: string;
    correlationId?: string;
    userId?: string;
    requestId?: string;
    durationMs?: number;
    error?: Error;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): StructuredLogEntry | null {
    if (!shouldLog(entry.level)) return null;

    const logEntry: StructuredLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level: entry.level,
      message: entry.message,
      service: entry.service || 'iassetspro',
      context: entry.context,
      traceId: entry.traceId,
      correlationId: entry.correlationId,
      userId: entry.userId,
      requestId: entry.requestId,
      durationMs: entry.durationMs,
      tags: entry.tags,
      metadata: entry.metadata,
    };

    if (entry.error) {
      logEntry.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
        code: (entry.error as unknown as Record<string, unknown>).code as string | undefined,
      };
    }

    logBuffer.push(logEntry);
    trimBuffer();

    // Anomaly detection
    detectErrorSpike(logEntry);

    // Forward to console logger
    const method = entry.level === 'trace' ? 'debug'
      : entry.level === 'fatal' ? 'error'
      : entry.level;
    console[method](
      `[${logEntry.timestamp}] [${entry.level.toUpperCase()}] [${logEntry.service}] ${entry.message}`,
      {
        traceId: logEntry.traceId,
        correlationId: logEntry.correlationId,
        userId: logEntry.userId,
        ...(logEntry.error ? { error: logEntry.error.message } : {}),
        ...(logEntry.metadata || {}),
      },
    );

    return logEntry;
  },

  /**
   * Convenience: log at trace level
   */
  trace(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'trace', message, ...opts });
  },

  debug(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'debug', message, ...opts });
  },

  info(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'info', message, ...opts });
  },

  warn(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'warn', message, ...opts });
  },

  error(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'error', message, ...opts });
  },

  fatal(message: string, opts?: Omit<Parameters<typeof this.log>[0], 'level' | 'message'>): StructuredLogEntry | null {
    return this.log({ level: 'fatal', message, ...opts });
  },

  // ── Log Search API ──────────────────────────────────────────────────────

  /**
   * Search logs by query parameters
   */
  search(query: LogQuery): LogSearchResult {
    const limit = Math.min(query.limit || 50, 500);
    const offset = Math.max(query.offset || 0, 0);

    let results = [...logBuffer];

    if (query.level) {
      results = results.filter(e => e.level === query.level);
    }
    if (query.service) {
      results = results.filter(e => e.service === query.service);
    }
    if (query.traceId) {
      results = results.filter(e => e.traceId === query.traceId);
    }
    if (query.correlationId) {
      results = results.filter(e => e.correlationId === query.correlationId);
    }
    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }
    if (query.requestId) {
      results = results.filter(e => e.requestId === query.requestId);
    }
    if (query.context) {
      results = results.filter(e => e.context === query.context);
    }
    if (query.messagePattern) {
      try {
        const regex = new RegExp(query.messagePattern, 'i');
        results = results.filter(e => regex.test(e.message));
      } catch {
        results = results.filter(e => e.message.includes(query.messagePattern!));
      }
    }
    if (query.since) {
      results = results.filter(e => e.timestamp >= query.since!);
    }
    if (query.until) {
      results = results.filter(e => e.timestamp <= query.until!);
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter(e =>
        e.tags && query.tags!.some(t => e.tags!.includes(t)),
      );
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = results.length;
    const entries = results.slice(offset, offset + limit);

    return {
      entries,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  },

  /**
   * Get a single log entry by ID
   */
  getById(id: string): StructuredLogEntry | undefined {
    return logBuffer.find(e => e.id === id);
  },

  // ── Log Statistics ──────────────────────────────────────────────────────

  /**
   * Get log statistics for the dashboard
   */
  getStats(hours: number = 24): LogStats {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const recent = logBuffer.filter(e => e.timestamp >= since);

    const byLevel: Record<LogLevel, number> = {
      trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0,
    };
    const byService: Record<string, number> = {};

    for (const entry of recent) {
      byLevel[entry.level]++;
      byService[entry.service] = (byService[entry.service] || 0) + 1;
    }

    // Hourly breakdown (last 24 hours)
    const byHour: Array<{ hour: string; count: number; errors: number }> = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - (i + 1) * 3600_000);
      const hourEnd = new Date(now.getTime() - i * 3600_000);
      const hourLabel = hourStart.toISOString().slice(0, 13);
      const hourEntries = recent.filter(e =>
        e.timestamp >= hourStart.toISOString() && e.timestamp < hourEnd.toISOString(),
      );
      byHour.push({
        hour: hourLabel,
        count: hourEntries.length,
        errors: hourEntries.filter(e => e.level === 'error' || e.level === 'fatal').length,
      });
    }

    const totalLogs = recent.length;
    const totalErrors = recent.filter(e => e.level === 'error' || e.level === 'fatal').length;

    return {
      totalEntries: logBuffer.length,
      byLevel,
      byService,
      byHour,
      errorRate: totalLogs > 0 ? Math.round((totalErrors / totalLogs) * 10000) / 100 : 0,
      anomalies: anomalyEvents.slice(-20),
    };
  },

  // ── Audit Trail ─────────────────────────────────────────────────────────

  /**
   * Record an audit trail entry (who did what, when)
   */
  recordAudit(entry: {
    action: string;
    actor: AuditTrailEntry['actor'];
    resource: AuditTrailEntry['resource'];
    details?: Record<string, unknown>;
    result?: 'success' | 'failure';
    changes?: AuditTrailEntry['changes'];
    correlationId?: string;
  }): AuditTrailEntry {
    const auditEntry: AuditTrailEntry = {
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      details: entry.details,
      result: entry.result || 'success',
      changes: entry.changes,
    };

    auditTrail.push(auditEntry);

    // Cap at 50,000 entries
    while (auditTrail.length > 50_000) {
      auditTrail.shift();
    }

    // Also log it
    this.info(`[AUDIT] ${entry.action}`, {
      context: 'audit',
      userId: entry.actor.userId,
      correlationId: entry.correlationId,
      metadata: {
        resource: entry.resource.type,
        resourceId: entry.resource.id,
        result: auditEntry.result,
      },
    });

    return auditEntry;
  },

  /**
   * Query audit trail entries
   */
  queryAudit(query: {
    action?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    result?: 'success' | 'failure';
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
  }): { entries: AuditTrailEntry[]; total: number } {
    let results = [...auditTrail];

    if (query.action) {
      results = results.filter(e => e.action.includes(query.action!));
    }
    if (query.userId) {
      results = results.filter(e => e.actor.userId === query.userId);
    }
    if (query.resourceType) {
      results = results.filter(e => e.resource.type === query.resourceType);
    }
    if (query.resourceId) {
      results = results.filter(e => e.resource.id === query.resourceId);
    }
    if (query.result) {
      results = results.filter(e => e.result === query.result);
    }
    if (query.since) {
      results = results.filter(e => e.timestamp >= query.since!);
    }
    if (query.until) {
      results = results.filter(e => e.timestamp <= query.until!);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = results.length;
    const limit = Math.min(query.limit || 50, 500);
    const offset = Math.max(query.offset || 0, 0);
    const entries = results.slice(offset, offset + limit);

    return { entries, total };
  },

  // ── Log Rotation ────────────────────────────────────────────────────────

  /**
   * Start automatic log rotation
   */
  startRotation(): void {
    if (rotationTimer) return;

    rotationTimer = setInterval(() => {
      this.rotate();
    }, retentionConfig.rotationCheckIntervalMs);

    if (rotationTimer.unref) rotationTimer.unref();
    logger.info('Log rotation started', { intervalMs: retentionConfig.rotationCheckIntervalMs });
  },

  /**
   * Stop automatic log rotation
   */
  stopRotation(): void {
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
  },

  /**
   * Perform log rotation — remove expired entries based on retention policy
   */
  rotate(): { removed: number; remaining: number } {
    const now = Date.now();
    let removed = 0;

    for (let i = logBuffer.length - 1; i >= 0; i--) {
      const entry = logBuffer[i];
      const entryTime = new Date(entry.timestamp).getTime();
      const retentionMs = (retentionConfig.levelRetention[entry.level] || retentionConfig.defaultRetentionHours) * 3600_000;

      if (now - entryTime > retentionMs) {
        logBuffer.splice(i, 1);
        removed++;
      } else {
        // Since buffer is sorted by time, we can break once we hit non-expired
        // Actually buffer is append-only, so oldest are at start
      }
    }

    // More efficient: since logBuffer is append-only, oldest entries are at the beginning
    // Re-scan from front
    const removed2 = removed;
    let idx = 0;
    while (idx < logBuffer.length) {
      const entry = logBuffer[idx];
      const entryTime = new Date(entry.timestamp).getTime();
      const retentionMs = (retentionConfig.levelRetention[entry.level] || retentionConfig.defaultRetentionHours) * 3600_000;

      if (now - entryTime > retentionMs) {
        idx++;
      } else {
        break;
      }
    }

    if (idx > removed2) {
      logBuffer.splice(0, idx);
      removed = idx;
    }

    // Clean old anomaly events (keep last 48 hours)
    const anomalyCutoff = now - 48 * 3600_000;
    let anomalyIdx = 0;
    while (anomalyIdx < anomalyEvents.length && new Date(anomalyEvents[anomalyIdx].detectedAt).getTime() < anomalyCutoff) {
      anomalyIdx++;
    }
    if (anomalyIdx > 0) {
      anomalyEvents.splice(0, anomalyIdx);
    }

    if (removed > 0) {
      logger.info('Log rotation completed', { removed, remaining: logBuffer.length });
    }

    return { removed, remaining: logBuffer.length };
  },

  // ── Anomaly Detection ───────────────────────────────────────────────────

  /**
   * Get detected anomalies
   */
  getAnomalies(limit: number = 50): LogAnomalyEvent[] {
    return anomalyEvents.slice(-limit).reverse();
  },

  /**
   * Clear anomalies
   */
  clearAnomalies(): void {
    anomalyEvents.length = 0;
  },

  // ── Reset ───────────────────────────────────────────────────────────────

  /**
   * Clear all logs, audit trail, and anomalies
   */
  clear(): void {
    logBuffer.length = 0;
    auditTrail.length = 0;
    anomalyEvents.length = 0;
    errorWindow.clear();
    logger.info('All logs and audit trail cleared');
  },
};
