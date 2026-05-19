// ============================================================================
// DATABASE HEALTH API — Admin endpoint for database diagnostics
// GET /api/admin/database-health
// ============================================================================

import { NextResponse } from 'next/server';
import { databaseAuditService } from '@/services/databaseAudit.service';
import {
  getSlowQueryStats,
  getSlowQueryThreshold,
} from '@/lib/slowQueryLogger';
import { createLogger } from '@/lib/logger';

const logger = createLogger('DatabaseHealthAPI');

export async function GET() {
  const startTime = performance.now();

  try {
    logger.info('Database health check requested');

    // Run all analyses in parallel for faster response
    const [
      indexAudit,
      storageStats,
      archivalCandidates,
      queryOptimization,
      slowQueryStats,
    ] = await Promise.allSettled([
      databaseAuditService.auditIndexes(),
      databaseAuditService.getStorageStats(),
      databaseAuditService.getArchivalCandidates(),
      databaseAuditService.getQueryOptimizationReport(),
      Promise.resolve(getSlowQueryStats()),
    ]);

    const duration = performance.now() - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(duration),
      data: {
        // Index audit
        indexAudit: indexAudit.status === 'fulfilled'
          ? {
              totalModels: indexAudit.value.totalModels,
              totalExplicitIndexes: indexAudit.value.summary.totalExplicitIndexes,
              autoFkIndexes: indexAudit.value.summary.totalAutoFkIndexes,
              missingRecommendations: indexAudit.value.summary.missingRecommendations,
              coveredFields: indexAudit.value.summary.coveredFields,
              recommendations: indexAudit.value.recommendations,
              fkFieldsVerified: indexAudit.value.fkFieldsVerified,
            }
          : { error: `Index audit failed: ${(indexAudit.reason as Error)?.message}` },

        // Storage stats
        storageStats: storageStats.status === 'fulfilled'
          ? {
              totalEstimatedSize: storageStats.value.totalEstimatedReadable,
              totalTables: storageStats.value.tables.length,
              largestTables: storageStats.value.largestTables.map(t => ({
                table: t.table,
                recordCount: t.recordCount,
                estimatedSize: t.estimatedSizeReadable,
                growthIndicator: t.growthIndicator,
              })),
              highGrowthTables: storageStats.value.highGrowthTables,
              allTables: storageStats.value.tables.map(t => ({
                table: t.table,
                recordCount: t.recordCount,
                estimatedSize: t.estimatedSizeReadable,
                growthIndicator: t.growthIndicator,
              })),
            }
          : { error: `Storage stats failed: ${(storageStats.reason as Error)?.message}` },

        // Archival candidates
        archivalCandidates: archivalCandidates.status === 'fulfilled'
          ? {
              totalCandidates: archivalCandidates.value.length,
              totalExpiredRecords: archivalCandidates.value.reduce((s, c) => s + c.expiredCount, 0),
              totalEstimatedSavings: formatSavings(archivalCandidates.value),
              candidates: archivalCandidates.value.map(c => ({
                table: c.table,
                retentionDays: c.retentionDays,
                currentCount: c.currentCount,
                expiredCount: c.expiredCount,
                estimatedSavings: c.estimatedSavingsReadable,
                riskLevel: c.riskLevel,
                cutoffDate: c.cutoffDate,
              })),
            }
          : { error: `Archival analysis failed: ${(archivalCandidates.reason as Error)?.message}` },

        // Query optimization
        queryOptimization: queryOptimization.status === 'fulfilled'
          ? {
              connectionPool: queryOptimization.value.connectionPool,
              selectOptimizations: queryOptimization.value.selectOptimization,
              nplusOnePatterns: queryOptimization.value.nplusOnePatterns,
              batchRecommendations: queryOptimization.value.batchRecommendations,
            }
          : { error: `Query optimization report failed: ${(queryOptimization.reason as Error)?.message}` },

        // Slow queries
        slowQueries: slowQueryStats.status === 'fulfilled'
          ? {
              totalSlowQueries: slowQueryStats.value.totalSlowQueries,
              uniquePatterns: slowQueryStats.value.uniquePatterns,
              thresholdMs: getSlowQueryThreshold(),
              windowStart: slowQueryStats.value.windowStart,
              windowEnd: slowQueryStats.value.windowEnd,
              slowestQueries: slowQueryStats.value.slowestQueries.slice(0, 10).map(q => ({
                id: q.id,
                query: q.query,
                durationMs: q.durationMs,
                source: q.source,
                timestamp: q.timestamp,
              })),
              mostFrequentPatterns: slowQueryStats.value.mostFrequentPatterns.slice(0, 10).map(p => ({
                normalizedQuery: p.normalizedQuery,
                count: p.count,
                avgDurationMs: p.avgDurationMs,
                maxDurationMs: p.maxDurationMs,
              })),
            }
          : { error: `Slow query stats failed: ${(slowQueryStats.reason as Error)?.message}` },
      },
    };

    logger.info('Database health check completed', {
      durationMs: Math.round(duration),
      success: true,
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Database health check failed', error as Error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(duration),
        error: 'Failed to generate database health report',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

function formatSavings(candidates: { estimatedSavingsBytes: number }[]): string {
  const total = candidates.reduce((sum, c) => sum + c.estimatedSavingsBytes, 0);
  if (total === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(total) / Math.log(1024));
  return `${(total / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
