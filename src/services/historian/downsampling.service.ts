// ============================================================================
// DOWNSAMPLING SERVICE — Multi-tier configurable time-series downsampling
// raw → 1min → 5min → 1hour → 1day → 1week with LTB tracking
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('historian:downsampling');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DownsamplingTier {
  interval: string;       // '1m', '5m', '1h', '1d', '1w'
  sourceInterval: string; // the interval from which this tier is built
  retentionDays: number;  // how long to keep this tier's readings
  bucketMs: number;       // milliseconds per bucket
}

export interface DownsamplingJobResult {
  sourceId: string;
  interval: string;
  bucketsProcessed: number;
  readingsAggregated: number;
  newDownsampledRecords: number;
  updatedRecords: number;
  durationMs: number;
}

export interface SourceDownsamplingStatus {
  sourceId: string;
  lastBucket: Record<string, Date | null>;  // interval → last bucket start
  totalDownsampled: Record<string, number>; // interval → count
}

/** Aggregation method type */
export type AggregationMethod = 'avg' | 'min' | 'max' | 'sum' | 'count' | 'stddev' | 'percentile';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIERS: DownsamplingTier[] = [
  { interval: '1m', sourceInterval: 'raw', retentionDays: 30, bucketMs: 60_000 },
  { interval: '5m', sourceInterval: '1m', retentionDays: 90, bucketMs: 300_000 },
  { interval: '1h', sourceInterval: '5m', retentionDays: 365, bucketMs: 3_600_000 },
  { interval: '1d', sourceInterval: '1h', retentionDays: 730, bucketMs: 86_400_000 },
  { interval: '1w', sourceInterval: '1d', retentionDays: 3650, bucketMs: 604_800_000 },
];

/** In-memory LTB (Last Time Bucket) tracker for incremental processing */
const ltbTracker = new Map<string, Map<string, Date>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

function computeStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Simple delta-of-delta encoding: stores deltas between consecutive values
 * then deltas between consecutive deltas. Returns a compact representation.
 * Used for in-memory compression before storage.
 */
export function deltaOfDeltaEncode(values: number[]): { firstValue: number; deltas: number[] } {
  if (values.length === 0) return { firstValue: 0, deltas: [] };
  if (values.length === 1) return { firstValue: values[0], deltas: [] };

  const deltas: number[] = [];
  let prevDelta = values[1] - values[0];
  deltas.push(prevDelta);

  for (let i = 2; i < values.length; i++) {
    const currentDelta = values[i] - values[i - 1];
    deltas.push(currentDelta - prevDelta);
    prevDelta = currentDelta;
  }

  return { firstValue: values[0], deltas };
}

/**
 * Decode delta-of-delta encoded data back to original values.
 */
export function deltaOfDeltaDecode(encoded: { firstValue: number; deltas: number[] }): number[] {
  if (encoded.deltas.length === 0) return [encoded.firstValue];

  const values: number[] = [encoded.firstValue];
  let prevDelta = encoded.deltas[0];
  values.push(encoded.firstValue + prevDelta);

  for (let i = 1; i < encoded.deltas.length; i++) {
    prevDelta += encoded.deltas[i];
    values.push(values[values.length - 1] + prevDelta);
  }

  return values;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const downsamplingService = {

  // ── LTB (Last Time Bucket) Tracking ───────────────────────────────────

  /**
   * Get the last processed bucket start for a source+interval pair.
   * Checks in-memory cache first, then DB.
   */
  async getLastBucket(sourceId: string, interval: string): Promise<Date | null> {
    // Check in-memory first
    const sourceMap = ltbTracker.get(sourceId);
    if (sourceMap?.has(interval)) {
      return sourceMap.get(interval)!;
    }

    // Check DB
    const lastReading = await db.downsampledReading.findFirst({
      where: { sourceId, interval },
      orderBy: { bucketStart: 'desc' },
      select: { bucketStart: true },
    });

    const lastBucket = lastReading?.bucketStart ?? null;

    // Update in-memory cache
    if (!ltbTracker.has(sourceId)) {
      ltbTracker.set(sourceId, new Map());
    }
    ltbTracker.get(sourceId)!.set(interval, lastBucket);

    return lastBucket;
  },

  /**
   * Update the in-memory LTB tracker after processing a bucket.
   */
  updateLtb(sourceId: string, interval: string, bucketStart: Date): void {
    if (!ltbTracker.has(sourceId)) {
      ltbTracker.set(sourceId, new Map());
    }
    ltbTracker.get(sourceId)!.set(interval, bucketStart);
  },

  // ── Policy Management ────────────────────────────────────────────────

  /**
   * Get the active downsampling policy for a source. Falls back to the global default.
   */
  async getPolicy(sourceId: string) {
    const cacheKey = `ds:policy:${sourceId}`;
    return cache.getOrSet(cacheKey, async () => {
      // Source-specific policy
      const sourcePolicy = await db.downsamplingPolicy.findFirst({
        where: { sourceId, isActive: true },
      });
      if (sourcePolicy) return sourcePolicy;

      // Global default (sourceId = null)
      const globalPolicy = await db.downsamplingPolicy.findFirst({
        where: { sourceId: null, isActive: true },
      });
      return globalPolicy;
    }, CACHE_TTL.LONG);
  },

  /**
   * Create or update a downsampling policy for a source.
   */
  async upsertPolicy(data: {
    sourceId?: string;
    rawRetentionDays?: number;
    minuteRetentionDays?: number;
    hourlyRetentionDays?: number;
    dailyRetentionDays?: number;
    weeklyRetentionDays?: number;
    aggregationMethod?: string;
    isActive?: boolean;
  }) {
    const existing = data.sourceId
      ? await db.downsamplingPolicy.findFirst({ where: { sourceId: data.sourceId } })
      : await db.downsamplingPolicy.findFirst({ where: { sourceId: null } });

    if (existing) {
      return db.downsamplingPolicy.update({
        where: { id: existing.id },
        data: {
          rawRetentionDays: data.rawRetentionDays,
          minuteRetentionDays: data.minuteRetentionDays,
          hourlyRetentionDays: data.hourlyRetentionDays,
          dailyRetentionDays: data.dailyRetentionDays,
          weeklyRetentionDays: data.weeklyRetentionDays,
          aggregationMethod: data.aggregationMethod,
          isActive: data.isActive,
        },
      });
    }

    return db.downsamplingPolicy.create({
      data: {
        sourceId: data.sourceId ?? null,
        rawRetentionDays: data.rawRetentionDays ?? 7,
        minuteRetentionDays: data.minuteRetentionDays ?? 30,
        hourlyRetentionDays: data.hourlyRetentionDays ?? 90,
        dailyRetentionDays: data.dailyRetentionDays ?? 730,
        weeklyRetentionDays: data.weeklyRetentionDays ?? 3650,
        aggregationMethod: data.aggregationMethod ?? 'avg',
        isActive: data.isActive ?? true,
      },
    });
  },

  // ── Core Downsampling Logic ──────────────────────────────────────────

  /**
   * Run downsampling for a single source at a single interval.
   * Processes only new data since the last bucket (LTB tracking).
   */
  async downsampleSource(
    sourceId: string,
    interval: DownsamplingTier,
    method: AggregationMethod = 'avg',
  ): Promise<DownsamplingJobResult> {
    const timer = logger.timer(`downsample:${sourceId}:${interval.interval}`);
    const lastBucket = await this.getLastBucket(sourceId, interval.interval);

    // Determine the source of readings
    const now = new Date();
    const searchStart = lastBucket || new Date(now.getTime() - interval.retentionDays * 86_400_000);

    let readings: Array<{ value: number; timestamp: Date; quality?: number }>;

    if (interval.sourceInterval === 'raw') {
      // Fetch from raw telemetry readings
      const rawReadings = await db.telemetryReading.findMany({
        where: {
          sourceId,
          timestamp: { gt: searchStart },
        },
        orderBy: { timestamp: 'asc' },
        select: { value: true, timestamp: true },
      });
      readings = rawReadings.map(r => ({ value: Number(r.value), timestamp: r.timestamp }));
    } else {
      // Fetch from the parent downsampled tier
      const parentReadings = await db.downsampledReading.findMany({
        where: {
          sourceId,
          interval: interval.sourceInterval,
          bucketStart: { gt: searchStart },
        },
        orderBy: { bucketStart: 'asc' },
        select: { avgValue: true, bucketStart: true, quality: true },
      });
      readings = parentReadings.map(r => ({
        value: Number(r.avgValue),
        timestamp: r.bucketStart,
        quality: r.quality ?? undefined,
      }));
    }

    if (readings.length === 0) {
      timer.end();
      return {
        sourceId,
        interval: interval.interval,
        bucketsProcessed: 0,
        readingsAggregated: 0,
        newDownsampledRecords: 0,
        updatedRecords: 0,
        durationMs: 0,
      };
    }

    // Group readings into time buckets
    const buckets = new Map<string, Array<{ value: number; timestamp: Date; quality?: number }>>();

    for (const reading of readings) {
      const ts = reading.timestamp.getTime();
      const bucketStart = Math.floor(ts / interval.bucketMs) * interval.bucketMs;
      const bucketKey = new Date(bucketStart).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(reading);
    }

    // Skip the last incomplete bucket (still filling up)
    const nowBucketStart = Math.floor(now.getTime() / interval.bucketMs) * interval.bucketMs;
    buckets.delete(new Date(nowBucketStart).toISOString());

    let newRecords = 0;
    let updatedRecords = 0;
    let totalReadingsAggregated = 0;

    // Process each bucket
    for (const [bucketKey, bucketReadings] of buckets) {
      const values = bucketReadings.map(r => r.value);
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const stdDev = computeStdDev(values, avg);

      let aggregateValue: number;
      switch (method) {
        case 'min': aggregateValue = sorted[0]; break;
        case 'max': aggregateValue = sorted[sorted.length - 1]; break;
        case 'sum': aggregateValue = values.reduce((s, v) => s + v, 0); break;
        case 'count': aggregateValue = values.length; break;
        case 'stddev': aggregateValue = stdDev; break;
        case 'percentile': aggregateValue = percentile(sorted, 50); break;
        default: aggregateValue = avg; break;
      }

      const avgQuality = bucketReadings.some(r => r.quality !== undefined)
        ? bucketReadings.filter(r => r.quality !== undefined).reduce((s, r) => s + r.quality!, 0) / bucketReadings.filter(r => r.quality !== undefined).length
        : 100;

      const bucketStart = new Date(bucketKey);

      // Upsert the downsampled record
      try {
        await db.downsampledReading.upsert({
          where: {
            sourceId_interval_bucketStart: {
              sourceId,
              interval: interval.interval,
              bucketStart,
            },
          },
          create: {
            sourceId,
            interval: interval.interval,
            bucketStart,
            avgValue: Math.round(avg * 100) / 100,
            minValue: sorted[0],
            maxValue: sorted[sorted.length - 1],
            sumValue: Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100,
            count: values.length,
            stdDev: Math.round(stdDev * 100) / 100,
            quality: Math.round(avgQuality * 100) / 100,
          },
          update: {
            avgValue: Math.round(avg * 100) / 100,
            minValue: sorted[0],
            maxValue: sorted[sorted.length - 1],
            sumValue: Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100,
            count: values.length,
            stdDev: Math.round(stdDev * 100) / 100,
            quality: Math.round(avgQuality * 100) / 100,
          },
        });

        if (lastBucket && bucketStart <= lastBucket) {
          updatedRecords++;
        } else {
          newRecords++;
        }

        this.updateLtb(sourceId, interval.interval, bucketStart);
      } catch (error) {
        logger.warn(`Failed to upsert downsampled record for ${sourceId}:${interval.interval}`, {
          bucket: bucketKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      totalReadingsAggregated += values.length;
    }

    const duration = timer.end();

    logger.info('Downsampling completed', {
      sourceId,
      interval: interval.interval,
      bucketsProcessed: buckets.size,
      totalReadingsAggregated,
      newRecords,
      updatedRecords,
      durationMs: duration,
    });

    return {
      sourceId,
      interval: interval.interval,
      bucketsProcessed: buckets.size,
      readingsAggregated: totalReadingsAggregated,
      newDownsampledRecords: newRecords,
      updatedRecords,
      durationMs: duration,
    };
  },

  /**
   * Run downsampling for a single source across all tiers.
   */
  async downsampleSourceAllTiers(sourceId: string): Promise<DownsamplingJobResult[]> {
    const policy = await this.getPolicy(sourceId);
    const method = (policy?.aggregationMethod || 'avg') as AggregationMethod;

    const results: DownsamplingJobResult[] = [];

    // Process tiers in order: 1m, 5m, 1h, 1d, 1w
    for (const tier of DEFAULT_TIERS) {
      try {
        const result = await this.downsampleSource(sourceId, tier, method);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to downsample tier ${tier.interval} for ${sourceId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Invalidate cache
    cache.deleteByPrefix(`ds:${sourceId}`);
    cache.deleteByPrefix(`ts:${sourceId}`);

    return results;
  },

  /**
   * Run downsampling for all active sources. Use this as a periodic job.
   */
  async runDownsamplingJob(sourceIds?: string[]): Promise<{
    totalResults: DownsamplingJobResult[];
    sourcesProcessed: number;
    totalDurationMs: number;
  }> {
    const jobTimer = logger.timer('downsampling:job');
    const allResults: DownsamplingJobResult[] = [];

    // Determine which sources to process
    const sources = sourceIds ?? (await this.getActiveSourceIds());

    for (const sourceId of sources) {
      try {
        const results = await this.downsampleSourceAllTiers(sourceId);
        allResults.push(...results);
      } catch (error) {
        logger.error(`Failed to downsample source ${sourceId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const totalDurationMs = jobTimer.end();

    logger.info('Downsampling job completed', {
      sourcesProcessed: sources.length,
      totalBuckets: allResults.reduce((s, r) => s + r.bucketsProcessed, 0),
      totalDurationMs,
    });

    return {
      totalResults: allResults,
      sourcesProcessed: sources.length,
      totalDurationMs,
    };
  },

  // ── Query Downsampled Data ───────────────────────────────────────────

  /**
   * Query downsampled data for a source within a time range.
   */
  async queryDownsampled(
    sourceId: string,
    interval: string,
    from: Date,
    to: Date,
    limit = 1000,
  ) {
    return db.downsampledReading.findMany({
      where: {
        sourceId,
        interval,
        bucketStart: { gte: from, lte: to },
      },
      orderBy: { bucketStart: 'asc' },
      take: limit,
    });
  },

  /**
   * Get the current downsampling status for a source.
   */
  async getSourceStatus(sourceId: string): Promise<SourceDownsamplingStatus> {
    const tiers = ['1m', '5m', '1h', '1d', '1w'];
    const lastBucket: Record<string, Date | null> = {};
    const totalDownsampled: Record<string, number> = {};

    const counts = await db.downsampledReading.groupBy({
      by: ['interval'],
      where: { sourceId },
      _count: { id: true },
      _max: { bucketStart: true },
    });

    for (const tier of tiers) {
      const match = counts.find(c => c.interval === tier);
      lastBucket[tier] = match?._max.bucketStart ?? null;
      totalDownsampled[tier] = match?._count.id ?? 0;
    }

    return { sourceId, lastBucket, totalDownsampled };
  },

  // ── Internal: Get Active Sources ─────────────────────────────────────

  /**
   * Get IDs of sources that have recent raw data (last 7 days).
   */
  async getActiveSourceIds(): Promise<string[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const result = await db.telemetryReading.groupBy({
      by: ['sourceId'],
      where: { timestamp: { gte: sevenDaysAgo } },
    });

    return result.map(r => r.sourceId);
  },

  /**
   * Get all configured downsampling policies.
   */
  async listPolicies() {
    return db.downsamplingPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Delete a downsampling policy.
   */
  async deletePolicy(id: string) {
    return db.downsamplingPolicy.delete({ where: { id } });
  },

  /**
   * Get list of available downsampling tiers.
   */
  getTiers(): DownsamplingTier[] {
    return [...DEFAULT_TIERS];
  },
};
