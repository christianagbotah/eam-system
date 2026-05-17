// ============================================================================
// RETENTION CLEANUP SERVICE — Data lifecycle management with configurable
// retention policies for different entity types
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('RetentionCleanup');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RetentionPolicyType =
  | 'telemetry_readings'
  | 'telemetry_streams'
  | 'downsampled_readings'
  | 'iot_readings'
  | 'audit_logs'
  | 'event_stream_records'
  | 'notifications'
  | 'sessions'
  | 'workflow_step_history'
  | 'workflow_instances'
  | 'anomaly_records'
  | 'document_search_logs'
  | 'chat_messages'
  | 'component_condition_readings'
  | 'geofence_events'
  | 'sync_operations'
  | 'all';

interface RetentionPolicyConfig {
  type: RetentionPolicyType;
  table: string;
  description: string;
  retentionDays: number;
  dateField: string;
  hasCascadeRelations: boolean;
  cascadeTables?: string[];
  additionalConditions?: string;
  batchStrategy: 'delete_direct' | 'delete_batched' | 'archive_then_delete';
  batchSize: number;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string;
}

interface RetentionStatusEntry {
  type: RetentionPolicyType;
  table: string;
  totalRecords: number;
  expiredRecords: number;
  retentionDays: number;
  cutoffDate: string;
  riskLevel: string;
  wouldFreeBytes: number;
  wouldFreeReadable: string;
}

interface CleanupResult {
  type: RetentionPolicyType;
  table: string;
  deletedCount: number;
  durationMs: number;
  error?: string;
  batchesProcessed: number;
}

interface RetentionStatusResult {
  timestamp: string;
  policies: RetentionPolicyConfig[];
  status: RetentionStatusEntry[];
  totalExpiredRecords: number;
  totalEstimatedSavingsBytes: number;
  totalEstimatedSavingsReadable: string;
}

interface CleanupSummaryResult {
  timestamp: string;
  results: CleanupResult[];
  totalDeleted: number;
  totalDurationMs: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

const RETENTION_POLICIES: RetentionPolicyConfig[] = [
  // --- Telemetry (highest volume, shortest retention) ---
  {
    type: 'telemetry_readings',
    table: 'telemetry_readings',
    description: 'Raw telemetry readings from industrial data sources',
    retentionDays: 30,
    dateField: 'timestamp',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 5000,
    riskLevel: 'low',
    notes: 'Raw readings are downsampled into telemetry_aggregations. Keep 30 days of raw data for real-time analysis and anomaly detection.',
  },
  {
    type: 'telemetry_streams',
    table: 'telemetry_streams',
    description: 'Raw telemetry stream records (individual data points)',
    retentionDays: 30,
    dateField: 'timestamp',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 5000,
    riskLevel: 'low',
    notes: 'Superseded by telemetry_aggregations. Raw stream data retained for 30 days.',
  },
  {
    type: 'downsampled_readings',
    table: 'downsampled_readings',
    description: 'Downsampled telemetry at 1min, 5min, 1h, 1d intervals',
    retentionDays: 365,
    dateField: 'bucketStart',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 5000,
    riskLevel: 'medium',
    notes: 'Tiered retention: 1min → 90 days, 5min → 1 year, 1h → 3 years. This policy applies the minimum (1 year).',
  },
  // --- IoT ---
  {
    type: 'iot_readings',
    table: 'iot_readings',
    description: 'IoT device sensor readings',
    retentionDays: 90,
    dateField: 'timestamp',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 5000,
    riskLevel: 'low',
    notes: 'IoT sensor data. 90-day retention for operational visibility.',
  },
  // --- Audit & Compliance ---
  {
    type: 'audit_logs',
    table: 'audit_logs',
    description: 'User action audit trail',
    retentionDays: 365,
    dateField: 'createdAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 2000,
    riskLevel: 'medium',
    notes: 'Audit logs are required for compliance. Archive before deletion. Recommended: export to cold storage at 365 days.',
  },
  // --- Event Stream ---
  {
    type: 'event_stream_records',
    table: 'event_stream_records',
    description: 'Industrial connectivity event stream records',
    retentionDays: 180,
    dateField: 'timestamp',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 5000,
    riskLevel: 'low',
    notes: 'Connectivity events (ingestion, alarms, anomalies, connections). 180-day retention for operational debugging.',
  },
  // --- Notifications ---
  {
    type: 'notifications',
    table: 'notifications',
    description: 'User notifications (MR/WO assignments, system alerts)',
    retentionDays: 365,
    dateField: 'createdAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 3000,
    riskLevel: 'low',
    notes: 'User notifications older than 1 year are rarely accessed. Safe to delete.',
  },
  // --- Sessions ---
  {
    type: 'sessions',
    table: 'sessions',
    description: 'Active and expired user sessions',
    retentionDays: 90,
    dateField: 'lastSeen',
    hasCascadeRelations: false,
    additionalConditions: 'expiresAt < NOW()',
    batchStrategy: 'delete_direct',
    batchSize: 1000,
    riskLevel: 'low',
    notes: 'Clean up expired sessions older than 90 days. Only delete sessions that are already expired.',
  },
  // --- Workflow ---
  {
    type: 'workflow_step_history',
    table: 'workflow_step_history',
    description: 'Workflow step execution history',
    retentionDays: 365,
    dateField: 'createdAt',
    hasCascadeRelations: true,
    cascadeTables: ['workflow_instances'],
    batchStrategy: 'delete_batched',
    batchSize: 2000,
    riskLevel: 'medium',
    notes: 'Workflow history needed for compliance. Archive completed workflow instances before cleanup.',
  },
  {
    type: 'workflow_instances',
    table: 'workflow_instances',
    description: 'Workflow instances (MR/WO approval workflows)',
    retentionDays: 365,
    dateField: 'createdAt',
    hasCascadeRelations: true,
    cascadeTables: ['workflow_step_history'],
    additionalConditions: "status IN ('completed', 'cancelled')",
    batchStrategy: 'delete_batched',
    batchSize: 1000,
    riskLevel: 'medium',
    notes: 'Only delete completed/cancelled workflows. Active workflows are preserved.',
  },
  // --- Analysis & Detection ---
  {
    type: 'anomaly_records',
    table: 'anomaly_records',
    description: 'Anomaly detection records from ML pipeline',
    retentionDays: 365,
    dateField: 'detectedAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 3000,
    riskLevel: 'low',
    notes: 'Historical anomaly data for ML model retraining. 365-day retention.',
  },
  {
    type: 'document_search_logs',
    table: 'document_search_logs',
    description: 'Document search analytics and usage patterns',
    retentionDays: 90,
    dateField: 'createdAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 3000,
    riskLevel: 'low',
    notes: 'Search analytics for UI optimization. 90-day retention sufficient for trend analysis.',
  },
  // --- Communication ---
  {
    type: 'chat_messages',
    table: 'chat_messages',
    description: 'Team chat messages',
    retentionDays: 365,
    dateField: 'createdAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 2000,
    riskLevel: 'medium',
    notes: 'Chat may contain operational decisions. Archive before deletion for compliance.',
  },
  // --- Component Intelligence ---
  {
    type: 'component_condition_readings',
    table: 'component_condition_readings',
    description: 'Component condition monitoring readings',
    retentionDays: 365,
    dateField: 'recordedAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 3000,
    riskLevel: 'medium',
    notes: 'Used for degradation analysis and predictive maintenance. 365-day retention.',
  },
  // --- Location ---
  {
    type: 'geofence_events',
    table: 'geofence_events',
    description: 'Geofence entry/exit events from mobile tracking',
    retentionDays: 180,
    dateField: 'timestamp',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 3000,
    riskLevel: 'low',
    notes: 'Location tracking events. 180-day retention for safety compliance.',
  },
  // --- Sync ---
  {
    type: 'sync_operations',
    table: 'sync_operations',
    description: 'Mobile offline sync operation logs',
    retentionDays: 90,
    dateField: 'createdAt',
    hasCascadeRelations: false,
    batchStrategy: 'delete_batched',
    batchSize: 2000,
    riskLevel: 'low',
    notes: 'Sync debug logs. 90-day retention for troubleshooting mobile sync issues.',
  },
];

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** Estimated average row size per table (bytes) */
const TABLE_AVG_ROW_SIZE: Record<string, number> = {
  telemetry_readings: 80,
  telemetry_streams: 100,
  downsampled_readings: 100,
  iot_readings: 80,
  audit_logs: 500,
  event_stream_records: 300,
  notifications: 300,
  sessions: 200,
  workflow_step_history: 400,
  workflow_instances: 350,
  anomaly_records: 250,
  document_search_logs: 200,
  chat_messages: 500,
  component_condition_readings: 150,
  geofence_events: 200,
  sync_operations: 400,
};

// ---------------------------------------------------------------------------
// Main Service
// ---------------------------------------------------------------------------

class RetentionCleanupService {
  /**
   * Get current record counts vs. what would remain after cleanup.
   */
  async getRetentionStatus(): Promise<RetentionStatusResult> {
    logger.info('Generating retention status report');
    const timestamp = new Date().toISOString();
    const status: RetentionStatusEntry[] = [];
    let totalExpired = 0;
    let totalSavings = 0;

    for (const policy of RETENTION_POLICIES) {
      const cutoffDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);

      try {
        // Count expired records
        let expiredQuery = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${policy.dateField} < ?`;
        const expiredParams = [cutoffDate.toISOString()];

        if (policy.additionalConditions) {
          expiredQuery += ` AND ${policy.additionalConditions}`;
        }

        const expiredResult = await db.$queryRawUnsafe<{ count: bigint }[]>(
          expiredQuery,
          ...expiredParams
        );
        const expiredRecords = Number(expiredResult[0]?.count ?? 0);

        // Count total records
        const totalResult = await db.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM ${policy.table}`
        );
        const totalRecords = Number(totalResult[0]?.count ?? 0);

        const avgRowSize = TABLE_AVG_ROW_SIZE[policy.table] || 200;
        const wouldFreeBytes = expiredRecords * avgRowSize;

        totalExpired += expiredRecords;
        totalSavings += wouldFreeBytes;

        status.push({
          type: policy.type,
          table: policy.table,
          totalRecords,
          expiredRecords,
          retentionDays: policy.retentionDays,
          cutoffDate: cutoffDate.toISOString(),
          riskLevel: policy.riskLevel,
          wouldFreeBytes,
          wouldFreeReadable: formatBytes(wouldFreeBytes),
        });
      } catch (error) {
        logger.warn(`Failed to get retention status for ${policy.table}`, {
          error: (error as Error).message,
        });
        status.push({
          type: policy.type,
          table: policy.table,
          totalRecords: 0,
          expiredRecords: 0,
          retentionDays: policy.retentionDays,
          cutoffDate: cutoffDate.toISOString(),
          riskLevel: policy.riskLevel,
          wouldFreeBytes: 0,
          wouldFreeReadable: '0 B',
        });
      }
    }

    logger.info('Retention status generated', {
      totalExpiredRecords: totalExpired,
      totalEstimatedSavings: formatBytes(totalSavings),
    });

    return {
      timestamp,
      policies: RETENTION_POLICIES,
      status,
      totalExpiredRecords: totalExpired,
      totalEstimatedSavingsBytes: totalSavings,
      totalEstimatedSavingsReadable: formatBytes(totalSavings),
    };
  }

  /**
   * Estimate cleanup savings without actually deleting anything.
   */
  async estimateCleanupSavings(policyType?: RetentionPolicyType): Promise<{
    type: RetentionPolicyType;
    table: string;
    recordsToRemove: number;
    savingsBytes: number;
    savingsReadable: string;
    cutoffDate: string;
    retentionDays: number;
  }[]> {
    const policies = policyType
      ? RETENTION_POLICIES.filter(p => p.type === policyType || policyType === 'all')
      : RETENTION_POLICIES;

    const estimates = [];
    for (const policy of policies) {
      const cutoffDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);

      try {
        let query = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${policy.dateField} < ?`;
        const params = [cutoffDate.toISOString()];

        if (policy.additionalConditions) {
          query += ` AND ${policy.additionalConditions}`;
        }

        const result = await db.$queryRawUnsafe<{ count: bigint }[]>(query, ...params);
        const count = Number(result[0]?.count ?? 0);
        const avgRowSize = TABLE_AVG_ROW_SIZE[policy.table] || 200;

        estimates.push({
          type: policy.type,
          table: policy.table,
          recordsToRemove: count,
          savingsBytes: count * avgRowSize,
          savingsReadable: formatBytes(count * avgRowSize),
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: policy.retentionDays,
        });
      } catch (error) {
        logger.warn(`Failed to estimate cleanup for ${policy.table}`, {
          error: (error as Error).message,
        });
        estimates.push({
          type: policy.type,
          table: policy.table,
          recordsToRemove: 0,
          savingsBytes: 0,
          savingsReadable: '0 B',
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: policy.retentionDays,
        });
      }
    }

    return estimates;
  }

  /**
   * Run retention cleanup for specified or all types.
   * Uses batched deletion to avoid locking tables for too long.
   */
  async runRetentionCleanup(
    policyType?: RetentionPolicyType
  ): Promise<CleanupSummaryResult> {
    const policies = policyType === 'all' || !policyType
      ? RETENTION_POLICIES
      : RETENTION_POLICIES.filter(p => p.type === policyType);

    if (policies.length === 0) {
      logger.warn('No matching retention policies found', { policyType });
      return {
        timestamp: new Date().toISOString(),
        results: [],
        totalDeleted: 0,
        totalDurationMs: 0,
        errors: ['No matching retention policies found'],
      };
    }

    logger.info('Starting retention cleanup', {
      policyCount: policies.length,
      policies: policies.map(p => p.type),
    });

    const results: CleanupResult[] = [];
    const errors: string[] = [];
    const totalStart = performance.now();

    for (const policy of policies) {
      try {
        const result = await this.cleanupPolicy(policy);
        results.push(result);
      } catch (error) {
        const msg = `Failed to cleanup ${policy.table}: ${(error as Error).message}`;
        logger.error(msg);
        errors.push(msg);
        results.push({
          type: policy.type,
          table: policy.table,
          deletedCount: 0,
          durationMs: 0,
          error: (error as Error).message,
          batchesProcessed: 0,
        });
      }
    }

    const totalDuration = performance.now() - totalStart;
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);

    logger.info('Retention cleanup completed', {
      totalDeleted,
      totalDurationMs: Math.round(totalDuration),
      errors: errors.length,
    });

    return {
      timestamp: new Date().toISOString(),
      results,
      totalDeleted,
      totalDurationMs: Math.round(totalDuration),
      errors,
    };
  }

  /**
   * Execute cleanup for a single policy using batched deletion.
   */
  private async cleanupPolicy(policy: RetentionPolicyConfig): Promise<CleanupResult> {
    const start = performance.now();
    const cutoffDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;
    let batchesProcessed = 0;

    logger.info(`Cleaning up ${policy.table}`, {
      retentionDays: policy.retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      batchStrategy: policy.batchStrategy,
      batchSize: policy.batchSize,
    });

    if (policy.batchStrategy === 'delete_batched') {
      // Batched deletion: delete in chunks to avoid long locks
      let hasMore = true;
      while (hasMore) {
        let deleteQuery = `DELETE FROM ${policy.table} WHERE ${policy.dateField} < ?`;
        const params: unknown[] = [cutoffDate.toISOString()];

        if (policy.additionalConditions) {
          deleteQuery += ` AND ${policy.additionalConditions}`;
        }

        deleteQuery += ` LIMIT ${policy.batchSize}`;

        const deleteResult = await db.$executeRawUnsafe(deleteQuery, ...params);
        const affectedRows = Number(deleteResult);

        if (affectedRows > 0) {
          totalDeleted += affectedRows;
          batchesProcessed++;
          logger.debug(`Batch ${batchesProcessed} for ${policy.table}: deleted ${affectedRows} rows`);

          // Small delay between batches to reduce lock contention
          if (affectedRows === policy.batchSize) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        // If we deleted fewer than batch size, we're done
        hasMore = affectedRows === policy.batchSize;
      }
    } else {
      // Direct deletion (for smaller tables or sessions)
      let deleteQuery = `DELETE FROM ${policy.table} WHERE ${policy.dateField} < ?`;
      const params: unknown[] = [cutoffDate.toISOString()];

      if (policy.additionalConditions) {
        deleteQuery += ` AND ${policy.additionalConditions}`;
      }

      const deleteResult = await db.$executeRawUnsafe(deleteQuery, ...params);
      totalDeleted = Number(deleteResult);
      batchesProcessed = 1;
    }

    const duration = performance.now() - start;

    logger.info(`Cleanup complete for ${policy.table}`, {
      deletedCount: totalDeleted,
      batchesProcessed,
      durationMs: Math.round(duration),
    });

    return {
      type: policy.type,
      table: policy.table,
      deletedCount: totalDeleted,
      durationMs: Math.round(duration),
      batchesProcessed,
    };
  }

  /**
   * Get the list of all configured retention policies.
   */
  getPolicies(): RetentionPolicyConfig[] {
    return [...RETENTION_POLICIES];
  }

  /**
   * Get a specific retention policy configuration.
   */
  getPolicy(type: RetentionPolicyType): RetentionPolicyConfig | undefined {
    return RETENTION_POLICIES.find(p => p.type === type);
  }
}

export const retentionCleanupService = new RetentionCleanupService();
export type {
  RetentionPolicyType,
  RetentionPolicyConfig,
  RetentionStatusEntry,
  RetentionStatusResult,
  CleanupResult,
  CleanupSummaryResult,
};
