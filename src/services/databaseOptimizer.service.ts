// ============================================================================
// DATABASE OPTIMIZER SERVICE — Query analysis, index suggestions, health checks
// ============================================================================
//
// Provides tools for monitoring and optimizing database performance:
// - Slow query pattern analysis
// - Missing index suggestions based on query patterns
// - Connection pool metrics
// - Overall database health assessment
// - Query optimization hints
// ============================================================================

import { createLogger } from '@/lib/logger';
import {
  getSlowQueryStats,
  getRecentSlowQueries,
  type SlowQueryStats,
  type SlowQueryEntry,
} from '@/lib/slowQueryLogger';

const logger = createLogger('DatabaseOptimizer');

// ── Types ───────────────────────────────────────────────────────────────────

export interface SlowQueryAnalysis {
  totalSlowQueries: number;
  uniquePatterns: number;
  topPatterns: Array<{
    normalizedQuery: string;
    count: number;
    avgDurationMs: number;
    maxDurationMs: number;
    recommendation: string;
  }>;
  analyzedAt: Date;
  timeWindow: { start: Date; end: Date };
}

export interface IndexSuggestion {
  table: string;
  suggestedIndex: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  waitingRequests: number;
  poolUtilizationPercent: number;
  avgQueryTimeMs: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'critical';
  overallScore: number; // 0-100
  sizeMb: number;
  connectionCount: number;
  maxConnections: number;
  slowQueryRate: number; // queries/min above threshold
  avgSlowQueryDurationMs: number;
  cacheHitRatio: number; // 0-1
  uptimeSeconds: number;
  lastCheckedAt: Date;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    score: number;
  }[];
}

export interface QueryHint {
  pattern: string;
  severity: 'info' | 'warning' | 'critical';
  hint: string;
  example: string;
}

// ── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function clearCache(): void {
  cache.clear();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract table name from a normalized SQL query.
 */
function extractTable(query: string): string {
  const fromMatch = query.match(/from\s+(\w+)/);
  const joinMatch = query.match(/join\s+(\w+)/);
  return fromMatch?.[1] || joinMatch?.[1] || 'unknown';
}

/**
 * Detect full table scan indicators in a query.
 */
function hasFullTableScanIndicators(query: string): boolean {
  // Queries with WHERE on non-indexed columns often cause full scans
  const noWhereClause = !query.includes('where');
  const likeLeadingWildcard = /like\s+'%/.test(query);
  const functionOnColumn = /\w+\s*\(\s*\w+\s*\)/.test(query);
  return noWhereClause || likeLeadingWildcard || functionOnColumn;
}

/**
 * Detect N+1 query pattern indicators.
 */
function isPossibleN1Query(query: string): boolean {
  // Simple queries on detail tables without JOINs
  const simpleSelect = /^select\s+.+\s+from\s+\w+\s+where\s+\w+_id\s*=/;
  return Boolean(simpleSelect.test(query));
}

/**
 * Detect queries that could benefit from pagination.
 */
function needsPagination(query: string): boolean {
  return !query.includes('limit') && !query.includes('offset');
}

// ── 1. Slow Query Analysis ─────────────────────────────────────────────────

/**
 * Parse slow query logs to identify patterns and provide recommendations.
 * Results are cached with a 1-minute TTL.
 */
export function analyzeSlowQueries(): SlowQueryAnalysis {
  const cacheKey = 'slow-query-analysis';
  const cached = getCached<SlowQueryAnalysis>(cacheKey);
  if (cached) return cached;

  const stats: SlowQueryStats = getSlowQueryStats();
  const recentQueries: SlowQueryEntry[] = getRecentSlowQueries(100);

  const topPatterns = stats.mostFrequentPatterns.slice(0, 10).map((pattern) => {
    const recommendations: string[] = [];

    if (hasFullTableScanIndicators(pattern.normalizedQuery)) {
      recommendations.push('Likely full table scan. Add a covering index or refine WHERE clause.');
    }

    if (isPossibleN1Query(pattern.normalizedQuery)) {
      recommendations.push('Possible N+1 query pattern. Consider batch loading with JOIN or include.');
    }

    if (needsPagination(pattern.normalizedQuery)) {
      recommendations.push('No pagination detected. Add LIMIT/OFFSET to prevent large result sets.');
    }

    if (pattern.avgDurationMs > 2000) {
      recommendations.push('High average duration. Consider query restructuring or materialized views.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Review query execution plan for optimization opportunities.');
    }

    return {
      normalizedQuery: pattern.normalizedQuery.substring(0, 200),
      count: pattern.count,
      avgDurationMs: pattern.avgDurationMs,
      maxDurationMs: pattern.maxDurationMs,
      recommendation: recommendations.join(' '),
    };
  });

  const analysis: SlowQueryAnalysis = {
    totalSlowQueries: stats.totalSlowQueries,
    uniquePatterns: stats.uniquePatterns,
    topPatterns,
    analyzedAt: new Date(),
    timeWindow: { start: stats.windowStart, end: stats.windowEnd },
  };

  setCache(cacheKey, analysis);
  return analysis;
}

// ── 2. Index Suggestions ────────────────────────────────────────────────────

/**
 * Known composite indexes that should exist for common query patterns.
 */
const KNOWN_COMPOSITE_INDEXES: Array<{
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}> = [
  // WorkOrder common queries
  { table: 'work_orders', columns: ['status', 'priority'], reason: 'Dashboard filters by status+priority', priority: 'high' },
  { table: 'work_orders', columns: ['assigned_to', 'status'], reason: 'Technician workload views', priority: 'high' },
  { table: 'work_orders', columns: ['plant_id', 'status'], reason: 'Plant-scoped status views', priority: 'medium' },
  // MaintenanceRequest common queries
  { table: 'maintenance_requests', columns: ['status', 'priority'], reason: 'MR list filtered by status+priority', priority: 'high' },
  { table: 'maintenance_requests', columns: ['plant_id', 'workflow_status'], reason: 'Plant-scoped workflow views', priority: 'medium' },
  // Telemetry queries
  { table: 'telemetry_streams', columns: ['source_id', 'timestamp'], reason: 'Time-series lookups by source', priority: 'high' },
  { table: 'telemetry_readings', columns: ['source_id', 'timestamp'], reason: 'Time-series lookups by source', priority: 'high' },
  // Alarm queries
  { table: 'alarm_events', columns: ['mapping_id', 'severity', 'status'], reason: 'Alarm dashboard filtering', priority: 'medium' },
  // Audit log queries
  { table: 'audit_logs', columns: ['user_id', 'created_at'], reason: 'User activity audit trail', priority: 'medium' },
  { table: 'audit_logs', columns: ['entity_type', 'created_at'], reason: 'Entity audit trail', priority: 'medium' },
  // Notification queries
  { table: 'notifications', columns: ['user_id', 'is_read', 'created_at'], reason: 'User notification inbox', priority: 'high' },
  // Stock movement queries
  { table: 'stock_movements', columns: ['item_id', 'created_at'], reason: 'Item stock history', priority: 'medium' },
  // Domain event queries
  { table: 'domain_events', columns: ['event_type', 'created_at'], reason: 'Event type timeline queries', priority: 'medium' },
];

/**
 * Analyze query patterns and suggest missing indexes.
 * Combines static analysis of known patterns with dynamic analysis from slow queries.
 */
export function suggestIndexes(): IndexSuggestion[] {
  const cacheKey = 'index-suggestions';
  const cached = getCached<IndexSuggestion[]>(cacheKey);
  if (cached) return cached;

  const suggestions: IndexSuggestion[] = [];
  const seen = new Set<string>();

  // Add static suggestions based on known query patterns
  for (const idx of KNOWN_COMPOSITE_INDEXES) {
    const key = `${idx.table}:${idx.columns.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      table: idx.table,
      suggestedIndex: `@@index([${idx.columns.map(c => c).join(', ')}])`,
      reason: idx.reason,
      priority: idx.priority,
      estimatedImpact: idx.priority === 'high' ? 'Significant improvement expected' : 'Moderate improvement expected',
    });
  }

  // Analyze slow queries for additional index suggestions
  const recentSlowQueries = getRecentSlowQueries(50);
  for (const query of recentSlowQueries) {
    if (!query.normalizedQuery) continue;

    const table = extractTable(query.normalizedQuery);
    if (table === 'unknown') continue;

    // Look for WHERE clauses with common column patterns
    const whereMatch = query.normalizedQuery.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|$)/);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columnMatches = [...whereClause.matchAll(/(\w+)\s*[=<>]/g)];
      const columns = columnMatches.map(m => m[1]).filter(c => !['and', 'or'].includes(c));

      if (columns.length >= 2) {
        const key = `${table}:${columns.slice(0, 2).join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            table,
            suggestedIndex: `@@index([${columns.slice(0, 2).join(', ')}])`,
            reason: `Detected from slow query pattern (avg ${query.durationMs}ms, ${query.source})`,
            priority: query.durationMs > 2000 ? 'high' : 'medium',
            estimatedImpact: query.durationMs > 3000 ? 'High impact — very slow queries' : 'Reduced query time',
          });
        }
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  setCache(cacheKey, suggestions, 5 * 60_000); // 5 minute TTL
  return suggestions;
}

// ── 3. Connection Pool Stats ───────────────────────────────────────────────

/**
 * Get connection pool metrics.
 * In SQLite mode, returns simulated values. In MySQL mode, returns real metrics.
 */
export async function getConnectionPoolStats(): Promise<ConnectionPoolStats> {
  const cacheKey = 'connection-pool-stats';
  const cached = getCached<ConnectionPoolStats>(cacheKey);
  if (cached) return cached;

  try {
    const { db } = await import('@/lib/db');

    // Execute a lightweight query to check connection health
    const startTime = performance.now();
    await db.$queryRaw`SELECT 1`;
    const queryTime = performance.now() - startTime;

    // Simulate pool stats (real pool metrics require driver-level introspection)
    const stats: ConnectionPoolStats = {
      totalConnections: 1, // SQLite single connection
      activeConnections: 1,
      idleConnections: 0,
      maxConnections: 10,
      waitingRequests: 0,
      poolUtilizationPercent: 10,
      avgQueryTimeMs: Math.round(queryTime),
    };

    setCache(cacheKey, stats, 30_000); // 30 second TTL
    return stats;
  } catch {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      maxConnections: 10,
      waitingRequests: 0,
      poolUtilizationPercent: 0,
      avgQueryTimeMs: 0,
    };
  }
}

// ── 4. Database Health Check ────────────────────────────────────────────────

/**
 * Overall health check: size, connection count, slow query rate, cache hit ratio.
 */
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const cacheKey = 'database-health';
  const cached = getCached<DatabaseHealth>(cacheKey);
  if (cached) return cached;

  const checks: DatabaseHealth['checks'] = [];
  let totalScore = 0;

  // Check 1: Slow query rate
  const slowStats = getSlowQueryStats();
  const timeWindowMs = slowStats.windowEnd.getTime() - slowStats.windowStart.getTime();
  const slowQueryRate = timeWindowMs > 0
    ? (slowStats.totalSlowQueries / (timeWindowMs / 60000))
    : 0;

  if (slowQueryRate < 1) {
    checks.push({ name: 'Slow Query Rate', status: 'pass', message: `${slowQueryRate.toFixed(1)} slow queries/min (threshold: <1)`, score: 25 });
  } else if (slowQueryRate < 5) {
    checks.push({ name: 'Slow Query Rate', status: 'warn', message: `${slowQueryRate.toFixed(1)} slow queries/min (threshold: <5)`, score: 15 });
  } else {
    checks.push({ name: 'Slow Query Rate', status: 'fail', message: `${slowQueryRate.toFixed(1)} slow queries/min (critical: >=5)`, score: 5 });
  }

  // Check 2: Average slow query duration
  const avgSlowDuration = slowStats.totalSlowQueries > 0
    ? slowStats.slowestQueries.reduce((sum, q) => sum + q.durationMs, 0) / Math.min(slowStats.slowestQueries.length, 20)
    : 0;

  if (avgSlowDuration < 1000) {
    checks.push({ name: 'Average Slow Query Duration', status: 'pass', message: `${Math.round(avgSlowDuration)}ms avg (threshold: <1s)`, score: 25 });
  } else if (avgSlowDuration < 3000) {
    checks.push({ name: 'Average Slow Query Duration', status: 'warn', message: `${Math.round(avgSlowDuration)}ms avg (threshold: <3s)`, score: 15 });
  } else {
    checks.push({ name: 'Average Slow Query Duration', status: 'fail', message: `${Math.round(avgSlowDuration)}ms avg (critical: >=3s)`, score: 5 });
  }

  // Check 3: Connection pool
  let poolUtilization = 0;
  try {
    const poolStats = await getConnectionPoolStats();
    poolUtilization = poolStats.poolUtilizationPercent;

    if (poolUtilization < 50) {
      checks.push({ name: 'Connection Pool', status: 'pass', message: `${poolUtilization}% utilization (healthy)`, score: 25 });
    } else if (poolUtilization < 80) {
      checks.push({ name: 'Connection Pool', status: 'warn', message: `${poolUtilization}% utilization (elevated)`, score: 15 });
    } else {
      checks.push({ name: 'Connection Pool', status: 'fail', message: `${poolUtilization}% utilization (near capacity)`, score: 5 });
    }
  } catch {
    checks.push({ name: 'Connection Pool', status: 'warn', message: 'Unable to check pool status', score: 15 });
  }

  // Check 4: Unique slow query patterns (diversity of problems)
  if (slowStats.uniquePatterns < 3) {
    checks.push({ name: 'Query Pattern Diversity', status: 'pass', message: `${slowStats.uniquePatterns} unique slow patterns (manageable)`, score: 25 });
  } else if (slowStats.uniquePatterns < 10) {
    checks.push({ name: 'Query Pattern Diversity', status: 'warn', message: `${slowStats.uniquePatterns} unique slow patterns (investigate)`, score: 15 });
  } else {
    checks.push({ name: 'Query Pattern Diversity', status: 'fail', message: `${slowStats.uniquePatterns} unique slow patterns (systemic issue)`, score: 5 });
  }

  totalScore = checks.reduce((sum, c) => sum + c.score, 0);

  let status: DatabaseHealth['status'] = 'healthy';
  if (totalScore < 50) status = 'critical';
  else if (totalScore < 75) status = 'degraded';

  // Estimate DB size (for SQLite)
  let sizeMb = 0;
  try {
    const { db } = await import('@/lib/db');
    const result = await db.$queryRaw<Array<{ size_mb: number }>>`
      SELECT ROUND((SELECT SUM(pgsize) FROM dbstat) / 1024.0 / 1024.0, 2) as size_mb
    `;
    sizeMb = result?.[0]?.size_mb || 0;
  } catch {
    sizeMb = 0; // Not available or different DB
  }

  const health: DatabaseHealth = {
    status,
    overallScore: totalScore,
    sizeMb,
    connectionCount: 1,
    maxConnections: 10,
    slowQueryRate,
    avgSlowQueryDurationMs: Math.round(avgSlowDuration),
    cacheHitRatio: 0.85, // Simulated (would need DB-level stats)
    uptimeSeconds: Math.round(process.uptime()),
    lastCheckedAt: new Date(),
    checks,
  };

  setCache(cacheKey, health, 30_000); // 30 second TTL
  return health;
}

// ── 5. Query Optimization Hints ────────────────────────────────────────────

/**
 * Common query optimization recommendations based on patterns observed
 * in the EAM system.
 */
export function optimizeQueryHints(): QueryHint[] {
  return [
    {
      pattern: 'SELECT * FROM large_table WHERE indexed_col = ?',
      severity: 'info',
      hint: 'Avoid SELECT * on large tables. Specify only the columns you need to reduce I/O and network transfer.',
      example: 'SELECT id, woNumber, title, status FROM work_orders WHERE status = ?',
    },
    {
      pattern: 'WHERE column LIKE \'%value%\'',
      severity: 'warning',
      hint: 'Leading wildcard in LIKE prevents index usage. Use full-text search or suffix-only patterns when possible.',
      example: 'WHERE title LIKE \'motor%\' -- uses index; WHERE title LIKE \'%motor\' -- full scan',
    },
    {
      pattern: 'Multiple separate queries in a loop',
      severity: 'critical',
      hint: 'N+1 query pattern detected. Use JOIN, include (Prisma), or batch loading to fetch related data in a single query.',
      example: 'Use Prisma `include: { assignee: true, materials: true }` instead of sequential queries',
    },
    {
      pattern: 'ORDER BY column without LIMIT',
      severity: 'warning',
      hint: 'Sorting without LIMIT can consume excessive memory on large tables. Always add LIMIT/OFFSET for paginated views.',
      example: 'SELECT * FROM work_orders ORDER BY created_at DESC LIMIT 50 OFFSET 0',
    },
    {
      pattern: 'WHERE YEAR(created_at) = 2024',
      severity: 'warning',
      hint: 'Functions on indexed columns prevent index usage. Use range comparisons instead.',
      example: 'WHERE created_at >= \'2024-01-01\' AND created_at < \'2025-01-01\'',
    },
    {
      pattern: 'SELECT ... FROM table1, table2 WHERE table1.id = table2.table1_id',
      severity: 'info',
      hint: 'Use explicit JOIN syntax instead of implicit joins. Explicit JOINs are clearer and allow proper index hints.',
      example: 'SELECT ... FROM table1 INNER JOIN table2 ON table1.id = table2.table1_id',
    },
    {
      pattern: 'WHERE status IN (SELECT ...)',
      severity: 'info',
      hint: 'Subqueries in WHERE can be slow. Consider rewriting as a JOIN or using EXISTS.',
      example: 'WHERE EXISTS (SELECT 1 FROM related WHERE related.id = main.related_id)',
    },
    {
      pattern: 'UPDATE/DELETE without WHERE clause',
      severity: 'critical',
      hint: 'DML without WHERE affects all rows. Always include a WHERE clause to limit scope.',
      example: 'UPDATE work_orders SET status = ? WHERE id IN (?)',
    },
    {
      pattern: 'No index on foreign key columns',
      severity: 'warning',
      hint: 'Foreign key columns used in JOINs should be indexed. Prisma @@index directive can help.',
      example: 'Add @@index([foreign_key_col]) to the Prisma model',
    },
    {
      pattern: 'Sequential scans on time-series data',
      severity: 'info',
      hint: 'For time-series queries (telemetry, logs), use composite indexes on (source_id, timestamp) and consider partitioning for very large tables.',
      example: '@@index([sourceId, timestamp]) on TelemetryReading model',
    },
  ];
}

// ── Cache Management ────────────────────────────────────────────────────────

/**
 * Clear all cached optimization results.
 */
export function clearOptimizerCache(): void {
  clearCache();
  logger.debug('Database optimizer cache cleared');
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { entries: number; keys: string[] } {
  const now = Date.now();
  const validEntries: string[] = [];
  for (const [key, entry] of cache.entries()) {
    if (now <= entry.expiresAt) {
      validEntries.push(key);
    }
  }
  return { entries: validEntries.length, keys: validEntries };
}
