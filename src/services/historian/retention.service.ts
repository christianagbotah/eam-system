// ============================================================================
// RETENTION SERVICE — Configurable retention policy engine for time-series data
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('historian:retention');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetentionPolicyTemplate {
  name: string;
  description: string;
  rawKeepDays: number;
  minuteKeepDays: number;
  hourlyKeepDays: number;
  dailyKeepDays: number;
  weeklyKeepDays: number;
  useCase: string;
}

export interface RetentionCleanupResult {
  policyId: string;
  policyName: string;
  sourceId: string | null;
  rawDeleted: number;
  downsampledDeleted: Record<string, number>; // interval → count
  totalDeleted: number;
  durationMs: number;
}

export interface RetentionSummary {
  totalPolicies: number;
  activePolicies: number;
  totalDataPoints: number;
  oldestData: Date | null;
  storageEstimateBytes: number;
  sources: Array<{
    sourceId: string;
    rawCount: number;
    oldestRaw: Date | null;
    newestRaw: Date | null;
    downsampledCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Templates for common industrial scenarios
// ---------------------------------------------------------------------------

export const RETENTION_TEMPLATES: RetentionPolicyTemplate[] = [
  {
    name: 'Standard Industrial',
    description: 'Balanced retention for general industrial monitoring',
    rawKeepDays: 7,
    minuteKeepDays: 30,
    hourlyKeepDays: 90,
    dailyKeepDays: 730,
    weeklyKeepDays: 3650,
    useCase: 'general',
  },
  {
    name: 'Critical Equipment',
    description: 'Extended retention for critical assets requiring long-term analysis',
    rawKeepDays: 30,
    minuteKeepDays: 90,
    hourlyKeepDays: 365,
    dailyKeepDays: 1825,
    weeklyKeepDays: 7300,
    useCase: 'critical',
  },
  {
    name: 'High-Frequency Sensor',
    description: 'Aggressive downsampling for high-frequency sensors generating lots of data',
    rawKeepDays: 3,
    minuteKeepDays: 14,
    hourlyKeepDays: 60,
    dailyKeepDays: 365,
    weeklyKeepDays: 1825,
    useCase: 'high_frequency',
  },
  {
    name: 'Regulatory Compliance',
    description: 'Long-term retention for regulatory and audit requirements',
    rawKeepDays: 90,
    minuteKeepDays: 365,
    hourlyKeepDays: 1825,
    dailyKeepDays: 3650,
    weeklyKeepDays: 18250,
    useCase: 'compliance',
  },
  {
    name: 'Minimal Storage',
    description: 'Minimal retention for low-priority data streams',
    rawKeepDays: 1,
    minuteKeepDays: 7,
    hourlyKeepDays: 30,
    dailyKeepDays: 90,
    weeklyKeepDays: 365,
    useCase: 'minimal',
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const retentionService = {

  // ── Policy Management ────────────────────────────────────────────────

  /**
   * List all retention policies.
   */
  async listPolicies() {
    return db.retentionPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get a single retention policy by ID.
   */
  async getPolicy(id: string) {
    return db.retentionPolicy.findUnique({ where: { id } });
  },

  /**
   * Create a new retention policy.
   */
  async createPolicy(data: {
    name: string;
    description?: string;
    sourceId?: string;
    keepDays: number;
    aggregationKeepDays?: number;
    createdById: string;
  }) {
    const policy = await db.retentionPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        sourceId: data.sourceId ?? null,
        keepDays: data.keepDays,
        aggregationKeepDays: data.aggregationKeepDays ?? null,
        isActive: true,
        totalDeleted: 0,
        createdById: data.createdById,
      },
    });

    logger.info('Created retention policy', { policyId: policy.id, name: policy.name, keepDays: policy.keepDays });
    return policy;
  },

  /**
   * Update a retention policy.
   */
  async updatePolicy(id: string, data: {
    name?: string;
    description?: string;
    keepDays?: number;
    aggregationKeepDays?: number;
    isActive?: boolean;
  }) {
    const policy = await db.retentionPolicy.update({
      where: { id },
      data,
    });

    cache.deleteByPrefix('retention:');
    return policy;
  },

  /**
   * Delete a retention policy.
   */
  async deletePolicy(id: string) {
    return db.retentionPolicy.delete({ where: { id } });
  },

  /**
   * Apply a retention template to create a policy.
   */
  async applyTemplate(templateName: string, sourceId: string | undefined, createdById: string) {
    const template = RETENTION_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found. Available: ${RETENTION_TEMPLATES.map(t => t.name).join(', ')}`);
    }

    // Create one policy for raw data and one for each downsampled tier
    const policies = [];

    // Raw data policy
    policies.push(await this.createPolicy({
      name: `${template.name} — Raw`,
      description: `${template.description} (raw data)`,
      sourceId,
      keepDays: template.rawKeepDays,
      createdById,
    }));

    // Downsampled tier policies
    const tiers = [
      { interval: '1m', days: template.minuteKeepDays },
      { interval: '5m', days: template.hourlyKeepDays },
      { interval: '1h', days: template.hourlyKeepDays },
      { interval: '1d', days: template.dailyKeepDays },
      { interval: '1w', days: template.weeklyKeepDays },
    ] as const;

    for (const tier of tiers) {
      policies.push(await this.createPolicy({
        name: `${template.name} — ${tier.interval}`,
        description: `${template.description} (${tier.interval} downsampled)`,
        sourceId,
        keepDays: tier.days,
        createdById,
      }));
    }

    return policies;
  },

  // ── Cleanup Execution ───────────────────────────────────────────────

  /**
   * Execute cleanup for a single retention policy.
   * Deletes raw telemetry readings and downsampled readings older than the policy's keepDays.
   */
  async executeCleanup(policyId: string): Promise<RetentionCleanupResult> {
    const timer = logger.timer(`retention:cleanup:${policyId}`);
    const policy = await db.retentionPolicy.findUnique({ where: { id: policyId } });

    if (!policy) {
      throw new Error(`RetentionPolicy with id '${policyId}' not found`);
    }

    if (!policy.isActive) {
      return {
        policyId,
        policyName: policy.name,
        sourceId: policy.sourceId,
        rawDeleted: 0,
        downsampledDeleted: {},
        totalDeleted: 0,
        durationMs: 0,
      };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.keepDays);

    let rawDeleted = 0;
    const downsampledDeleted: Record<string, number> = {};

    // Delete raw telemetry readings
    const rawWhere: Record<string, unknown> = { timestamp: { lt: cutoff } };
    if (policy.sourceId) {
      rawWhere.sourceId = policy.sourceId;
    }

    try {
      const rawResult = await db.telemetryReading.deleteMany({ where: rawWhere });
      rawDeleted = rawResult.count;
    } catch (error) {
      logger.error('Failed to delete raw readings', {
        policyId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Delete downsampled readings older than aggregationKeepDays or keepDays (whichever is larger)
    const aggCutoff = new Date();
    const aggKeepDays = policy.aggregationKeepDays ?? policy.keepDays;
    aggCutoff.setDate(aggCutoff.getDate() - aggKeepDays);

    const intervals = ['1m', '5m', '1h', '1d', '1w'];

    for (const interval of intervals) {
      const dsWhere: Record<string, unknown> = { interval, bucketStart: { lt: aggCutoff } };
      if (policy.sourceId) {
        dsWhere.sourceId = policy.sourceId;
      }

      try {
        const dsResult = await db.downsampledReading.deleteMany({ where: dsWhere });
        downsampledDeleted[interval] = dsResult.count;
      } catch (error) {
        logger.error(`Failed to delete downsampled readings for interval ${interval}`, {
          policyId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const totalDeleted = rawDeleted + Object.values(downsampledDeleted).reduce((s, c) => s + c, 0);

    // Update policy with execution stats
    await db.retentionPolicy.update({
      where: { id: policyId },
      data: {
        lastExecutedAt: new Date(),
        totalDeleted: { increment: totalDeleted },
      },
    });

    const durationMs = timer.end();

    logger.info('Retention cleanup completed', {
      policyId,
      policyName: policy.name,
      rawDeleted,
      totalDeleted,
      durationMs,
    });

    return {
      policyId,
      policyName: policy.name,
      sourceId: policy.sourceId,
      rawDeleted,
      downsampledDeleted,
      totalDeleted,
      durationMs,
    };
  },

  /**
   * Execute cleanup for all active retention policies.
   */
  async executeAllCleanup(): Promise<{
    results: RetentionCleanupResult[];
    totalDeleted: number;
    durationMs: number;
  }> {
    const timer = logger.timer('retention:cleanup:all');
    const policies = await db.retentionPolicy.findMany({
      where: { isActive: true },
    });

    const results: RetentionCleanupResult[] = [];
    let totalDeleted = 0;

    for (const policy of policies) {
      try {
        const result = await this.executeCleanup(policy.id);
        results.push(result);
        totalDeleted += result.totalDeleted;
      } catch (error) {
        logger.error(`Failed to execute cleanup for policy ${policy.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Invalidate caches
    cache.deleteByPrefix('retention:');
    cache.deleteByPrefix('ds:');
    cache.deleteByPrefix('ts:');

    const durationMs = timer.end();

    logger.info('All retention cleanup completed', {
      policiesProcessed: policies.length,
      totalDeleted,
      durationMs,
    });

    return { results, totalDeleted, durationMs };
  },

  // ── Retention Summary & Stats ────────────────────────────────────────

  /**
   * Get a comprehensive retention summary across all sources.
   */
  async getSummary(): Promise<RetentionSummary> {
    const cacheKey = 'retention:summary';
    return cache.getOrSet(cacheKey, async () => {
      const [policies, sourceStats, oldestRaw] = await Promise.all([
        db.retentionPolicy.findMany(),
        db.telemetryReading.groupBy({
          by: ['sourceId'],
          _count: { id: true },
          _min: { timestamp: true },
          _max: { timestamp: true },
        }),
        db.telemetryReading.findFirst({
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true },
        }),
      ]);

      const totalDataPoints = sourceStats.reduce((s, r) => s + r._count.id, 0);

      const sources = sourceStats.map(r => ({
        sourceId: r.sourceId,
        rawCount: r._count.id,
        oldestRaw: r._min.timestamp,
        newestRaw: r._max.timestamp,
        downsampledCount: 0, // could be enriched but kept lightweight
      }));

      return {
        totalPolicies: policies.length,
        activePolicies: policies.filter(p => p.isActive).length,
        totalDataPoints,
        oldestData: oldestRaw?.timestamp ?? null,
        storageEstimateBytes: totalDataPoints * 64, // rough estimate: ~64 bytes per reading
        sources,
      };
    }, CACHE_TTL.MEDIUM);
  },

  /**
   * Get the list of available retention templates.
   */
  getTemplates(): RetentionPolicyTemplate[] {
    return [...RETENTION_TEMPLATES];
  },
};
