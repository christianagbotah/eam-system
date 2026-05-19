// ============================================================================
// SLOW QUERY LOGGER — Wraps Prisma raw queries to log slow ones, tracks patterns
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('SlowQueryLogger');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlowQueryEntry {
  id: string;
  query: string;
  durationMs: number;
  timestamp: Date;
  source: string; // e.g., '$queryRaw', '$executeRaw', '$queryRawUnsafe'
  params?: string;
  normalizedQuery?: string;
}

interface QueryPattern {
  normalizedQuery: string;
  count: number;
  totalDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  lastSeen: Date;
  sources: string[];
}

interface SlowQueryStats {
  totalSlowQueries: number;
  uniquePatterns: number;
  slowestQueries: SlowQueryEntry[];
  mostFrequentPatterns: QueryPattern[];
  thresholdMs: number;
  windowStart: Date;
  windowEnd: Date;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SLOW_QUERY_THRESHOLD_MS = 500;
const MAX_STORED_QUERIES = 1000;
const MAX_STORED_PATTERNS = 500;
const AUTO_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const QUERY_RETENTION_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// In-memory storage
// ---------------------------------------------------------------------------

const slowQueries: SlowQueryEntry[] = [];
const queryPatterns = new Map<string, QueryPattern>();
let lastCleanupTime = Date.now();

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

let idCounter = 0;
function generateId(): string {
  return `sq_${Date.now()}_${++idCounter}`;
}

/**
 * Normalize a SQL query for pattern matching.
 * Replaces literal values with placeholders.
 */
function normalizeQuery(query: string): string {
  return query
    // Replace string literals
    .replace(/'[^']*'/g, "'?'")
    // Replace numeric literals
    .replace(/\b\d+\.?\d*\b/g, '?')
    // Replace IN clause lists
    .replace(/\(\s*\?(?:\s*,\s*\?)*\s*\)/g, '(?)')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function truncateQuery(query: string, maxLength: number = 200): string {
  if (query.length <= maxLength) return query;
  return query.substring(0, maxLength) + '...';
}

function truncateParams(params: unknown, maxLength: number = 100): string {
  try {
    const str = JSON.stringify(params);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  } catch {
    return String(params).substring(0, maxLength);
  }
}

/**
 * Auto-cleanup old entries to prevent memory leaks.
 */
function autoCleanup(): void {
  const now = Date.now();
  if (now - lastCleanupTime < AUTO_CLEANUP_INTERVAL_MS) return;
  lastCleanupTime = now;

  const cutoff = new Date(now - QUERY_RETENTION_MS);

  // Remove old slow queries
  while (slowQueries.length > 0 && slowQueries[0].timestamp < cutoff) {
    slowQueries.shift();
  }

  // Also enforce max size
  while (slowQueries.length > MAX_STORED_QUERIES) {
    slowQueries.shift();
  }

  // Remove old patterns
  for (const [key, pattern] of queryPatterns.entries()) {
    if (pattern.lastSeen < cutoff) {
      queryPatterns.delete(key);
    }
  }

  // Enforce max patterns
  if (queryPatterns.size > MAX_STORED_PATTERNS) {
    const entries = [...queryPatterns.entries()]
      .sort((a, b) => b[1].lastSeen.getTime() - a[1].lastSeen.getTime());
    for (let i = MAX_STORED_PATTERNS; i < entries.length; i++) {
      queryPatterns.delete(entries[i][0]);
    }
  }

  logger.debug('Auto-cleanup completed', {
    remainingQueries: slowQueries.length,
    remainingPatterns: queryPatterns.size,
  });
}

// ---------------------------------------------------------------------------
// Core logging
// ---------------------------------------------------------------------------

/**
 * Record a slow query.
 */
function recordSlowQuery(
  query: string,
  durationMs: number,
  source: string,
  params?: unknown
): void {
  autoCleanup();

  const normalized = normalizeQuery(query);

  const entry: SlowQueryEntry = {
    id: generateId(),
    query: truncateQuery(query),
    durationMs: Math.round(durationMs),
    timestamp: new Date(),
    source,
    params: params ? truncateParams(params) : undefined,
    normalizedQuery: normalized,
  };

  slowQueries.push(entry);

  // Update pattern tracking
  const existing = queryPatterns.get(normalized);
  if (existing) {
    existing.count++;
    existing.totalDurationMs += durationMs;
    existing.avgDurationMs = Math.round(existing.totalDurationMs / existing.count);
    existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
    existing.lastSeen = new Date();
    if (!existing.sources.includes(source)) {
      existing.sources.push(source);
    }
  } else {
    queryPatterns.set(normalized, {
      normalizedQuery: normalized,
      count: 1,
      totalDurationMs: durationMs,
      avgDurationMs: Math.round(durationMs),
      maxDurationMs: Math.round(durationMs),
      lastSeen: new Date(),
      sources: [source],
    });
  }

  logger.warn('Slow query detected', {
    id: entry.id,
    durationMs: entry.durationMs,
    source: entry.source,
    queryPreview: truncateQuery(query, 150),
    normalized: normalized.substring(0, 100),
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wrap an async raw query function to log slow queries.
 * Usage: wrapRawQuery(db.$queryRaw.bind(db)) or wrapRawQuery(db.$executeRaw.bind(db))
 */
function wrapRawQuery<T extends (...args: unknown[]) => Promise<unknown>>(
  originalFn: T,
  source: string
): T {
  return ((...args: unknown[]) => {
    const start = performance.now();
    return (originalFn(...args) as Promise<unknown>).then(result => {
      const duration = performance.now() - start;
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        // Extract query from tagged template or first arg
        const query = typeof args[0] === 'string'
          ? args[0] as string
          : Array.isArray(args[0])
            ? (args[0] as unknown[]).map(a => typeof a === 'string' ? a : '?').join('')
            : String(args[0]);
        recordSlowQuery(query, duration, source, args.length > 1 ? args.slice(1) : undefined);
      }
      return result;
    }).catch(error => {
      const duration = performance.now() - start;
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        const query = typeof args[0] === 'string'
          ? args[0] as string
          : Array.isArray(args[0])
            ? (args[0] as unknown[]).map(a => typeof a === 'string' ? a : '?').join('')
            : String(args[0]);
        recordSlowQuery(query, duration, source, args.length > 1 ? args.slice(1) : undefined);
      }
      throw error;
    });
  }) as T;
}

/**
 * Install slow query logging on a Prisma client instance.
 * Returns a cleanup function to restore original methods.
 */
function installSlowQueryLogging(
  prismaClient: Record<string, unknown>
): () => void {
  const originalQueryRaw = prismaClient.$queryRaw;
  const originalExecuteRaw = prismaClient.$executeRaw;
  const originalQueryRawUnsafe = prismaClient.$queryRawUnsafe;
  const originalExecuteRawUnsafe = prismaClient.$executeRawUnsafe;

  prismaClient.$queryRaw = wrapRawQuery(originalQueryRaw as (...args: unknown[]) => Promise<unknown>, '$queryRaw');
  prismaClient.$executeRaw = wrapRawQuery(originalExecuteRaw as (...args: unknown[]) => Promise<unknown>, '$executeRaw');
  prismaClient.$queryRawUnsafe = wrapRawQuery(originalQueryRawUnsafe as (...args: unknown[]) => Promise<unknown>, '$queryRawUnsafe');
  prismaClient.$executeRawUnsafe = wrapRawQuery(originalExecuteRawUnsafe as (...args: unknown[]) => Promise<unknown>, '$executeRawUnsafe');

  logger.info('Slow query logging installed', {
    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
    maxStoredQueries: MAX_STORED_QUERIES,
  });

  // Return cleanup function
  return () => {
    prismaClient.$queryRaw = originalQueryRaw;
    prismaClient.$executeRaw = originalExecuteRaw;
    prismaClient.$queryRawUnsafe = originalQueryRawUnsafe;
    prismaClient.$executeRawUnsafe = originalExecuteRawUnsafe;
    logger.info('Slow query logging uninstalled');
  };
}

/**
 * Get recent slow queries.
 */
function getRecentSlowQueries(limit: number = 50): SlowQueryEntry[] {
  autoCleanup();
  return slowQueries.slice(-limit).reverse();
}

/**
 * Get slow query statistics and patterns.
 */
function getSlowQueryStats(): SlowQueryStats {
  autoCleanup();

  const now = new Date();
  const windowStart = slowQueries.length > 0 ? slowQueries[0].timestamp : now;

  const slowestQueries = [...slowQueries]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 20);

  const mostFrequentPatterns = [...queryPatterns.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalSlowQueries: slowQueries.length,
    uniquePatterns: queryPatterns.size,
    slowestQueries,
    mostFrequentPatterns,
    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
    windowStart,
    windowEnd: now,
  };
}

/**
 * Clear all stored slow queries and patterns.
 */
function clearSlowQueries(): void {
  slowQueries.length = 0;
  queryPatterns.clear();
  logger.info('Slow query log cleared');
}

// Mutable threshold
let slowQueryThresholdMs = SLOW_QUERY_THRESHOLD_MS;

function getSlowQueryThreshold(): number {
  return slowQueryThresholdMs;
}

function setSlowQueryThreshold(ms: number): void {
  slowQueryThresholdMs = ms;
  logger.info(`Slow query threshold updated to ${ms}ms`);
}

export {
  installSlowQueryLogging,
  getRecentSlowQueries,
  getSlowQueryStats,
  clearSlowQueries,
  recordSlowQuery,
  normalizeQuery,
  getSlowQueryThreshold,
  setSlowQueryThreshold,
};

export type {
  SlowQueryEntry,
  QueryPattern,
  SlowQueryStats,
};
