// ============================================================================
// AGGREGATION PIPELINE — Multi-source aggregation, gap filling, rollups,
// time-weighted averages, comparison queries, and statistical summaries
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('historian:aggregation');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GapFillStrategy = 'forward_fill' | 'linear_interpolation' | 'none';
export type RollupInterval = '1h' | '1d' | '1w' | '1mo';

export interface MultiSourceAggregationQuery {
  sourceIds: string[];
  from: Date;
  to: Date;
  interval?: string;       // bucket size for aggregation
  gapFill?: GapFillStrategy;
  maxGapMinutes?: number;  // max gap before applying fill (default: 60)
}

export interface TimeWeightedAverageQuery {
  sourceId: string;
  from: Date;
  to: Date;
}

export interface RollupQuery {
  sourceIds: string[];
  from: Date;
  to: Date;
  rollupTo: RollupInterval;
}

export interface ComparisonQuery {
  sourceId: string;
  currentFrom: Date;
  currentTo: Date;
  lookbackPeriod?: 'day' | 'week' | 'month'; // for previous period
}

export interface StatisticalSummary {
  sourceId: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  skewness: number;
  kurtosis: number;
}

export interface AggregatedBucket {
  timestamp: string;
  sourceId: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  stdDev: number | null;
  quality: number | null;
}

export interface RollupResult {
  interval: string;
  data: AggregatedBucket[];
}

export interface ComparisonResult {
  current: StatisticalSummary;
  previous: StatisticalSummary;
  changePercent: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Interval mapping
// ---------------------------------------------------------------------------

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
};

const ROLLUP_INTERVAL_MS: Record<RollupInterval, number> = {
  '1h': 3_600_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
  '1mo': 30 * 86_400_000, // approximate
};

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
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function computeSkewness(values: number[], mean: number, stdDev: number): number {
  if (values.length < 3 || stdDev === 0) return 0;
  const n = values.length;
  const sum = values.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

function computeKurtosis(values: number[], mean: number, stdDev: number): number {
  if (values.length < 4 || stdDev === 0) return 0;
  const n = values.length;
  const sum = values.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

/**
 * Apply gap-filling strategy to a sorted array of time-series points.
 */
function applyGapFill(
  points: Array<{ timestamp: Date; value: number }>,
  expectedIntervalMs: number,
  strategy: GapFillStrategy,
  maxGapMs: number,
): Array<{ timestamp: Date; value: number; isFilled: boolean }> {
  if (points.length < 2 || strategy === 'none') {
    return points.map(p => ({ ...p, isFilled: false }));
  }

  const result: Array<{ timestamp: Date; value: number; isFilled: boolean }> = [];
  result.push({ ...points[0], isFilled: false });

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const gap = curr.timestamp.getTime() - prev.timestamp.getTime();

    if (gap > expectedIntervalMs * 1.5 && gap <= maxGapMs) {
      // Fill the gap
      const numPointsToFill = Math.floor(gap / expectedIntervalMs) - 1;

      for (let j = 1; j <= numPointsToFill; j++) {
        const filledTimestamp = new Date(prev.timestamp.getTime() + j * expectedIntervalMs);
        let filledValue: number;

        switch (strategy) {
          case 'forward_fill':
            filledValue = prev.value;
            break;
          case 'linear_interpolation':
            filledValue = prev.value + ((curr.value - prev.value) * (j * expectedIntervalMs)) / gap;
            break;
          default:
            filledValue = prev.value;
        }

        result.push({ timestamp: filledTimestamp, value: Math.round(filledValue * 100) / 100, isFilled: true });
      }
    }

    result.push({ ...curr, isFilled: false });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const aggregationPipelineService = {

  // ── Multi-Source Aggregation ─────────────────────────────────────────

  /**
   * Aggregate multiple sources into unified time buckets with optional gap filling.
   */
  async multiSourceAggregate(query: MultiSourceAggregationQuery): Promise<AggregatedBucket[]> {
    const {
      sourceIds,
      from,
      to,
      interval = '1h',
      gapFill = 'none',
      maxGapMinutes = 60,
    } = query;

    const bucketMs = INTERVAL_MS[interval] ?? 3_600_000;
    const maxGapMs = maxGapMinutes * 60_000;
    const allBuckets: AggregatedBucket[] = [];

    // Fetch raw readings for all sources in parallel
    const readingsBySource = await Promise.all(
      sourceIds.map(async (sourceId) => {
        const readings = await db.telemetryReading.findMany({
          where: { sourceId, timestamp: { gte: from, lte: to } },
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
        });
        return { sourceId, readings: readings.map(r => ({ value: Number(r.value), timestamp: r.timestamp })) };
      }),
    );

    for (const { sourceId, readings } of readingsBySource) {
      if (readings.length === 0) continue;

      // Apply gap filling if requested
      const processedReadings = gapFill !== 'none'
        ? applyGapFill(readings, bucketMs, gapFill, maxGapMs)
        : readings.map(r => ({ ...r, isFilled: false }));

      // Group into time buckets
      const buckets = new Map<string, number[]>();

      for (const point of processedReadings) {
        const ts = point.timestamp.getTime();
        const bucketStart = Math.floor(ts / bucketMs) * bucketMs;
        const bucketKey = new Date(bucketStart).toISOString();

        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey)!.push(point.value);
      }

      // Compute aggregations per bucket
      for (const [bucketKey, values] of buckets) {
        if (values.length === 0) continue;

        const sorted = [...values].sort((a, b) => a - b);
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const stdDev = computeStdDev(values, avg);

        allBuckets.push({
          timestamp: bucketKey,
          sourceId,
          avg: Math.round(avg * 100) / 100,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          count: values.length,
          stdDev: Math.round(stdDev * 100) / 100,
          quality: 100,
        });
      }
    }

    // Sort by timestamp, then by sourceId
    allBuckets.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.sourceId.localeCompare(b.sourceId));

    return allBuckets;
  },

  // ── Time-Weighted Average ───────────────────────────────────────────

  /**
   * Compute the time-weighted average for a source over a time range.
   * Each reading's contribution is weighted by the duration it was valid.
   */
  async timeWeightedAverage(query: TimeWeightedAverageQuery): Promise<{
    sourceId: string;
    twa: number;
    simpleAvg: number;
    duration: number;
    pointCount: number;
  }> {
    const readings = await db.telemetryReading.findMany({
      where: { sourceId: query.sourceId, timestamp: { gte: query.from, lte: query.to } },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    if (readings.length === 0) {
      return { sourceId: query.sourceId, twa: 0, simpleAvg: 0, duration: 0, pointCount: 0 };
    }

    const values = readings.map(r => Number(r.value));
    const simpleAvg = values.reduce((s, v) => s + v, 0) / values.length;

    // Time-weighted: weight each value by the time until the next reading
    let weightedSum = 0;
    let totalTime = 0;

    for (let i = 0; i < readings.length; i++) {
      const nextTime = i < readings.length - 1
        ? readings[i + 1].timestamp.getTime()
        : query.to.getTime();

      const duration = nextTime - readings[i].timestamp.getTime();

      if (duration > 0) {
        weightedSum += Number(readings[i].value) * duration;
        totalTime += duration;
      }
    }

    const twa = totalTime > 0 ? weightedSum / totalTime : simpleAvg;
    const duration = query.to.getTime() - query.from.getTime();

    return {
      sourceId: query.sourceId,
      twa: Math.round(twa * 100) / 100,
      simpleAvg: Math.round(simpleAvg * 100) / 100,
      duration,
      pointCount: readings.length,
    };
  },

  // ── Rollup Queries ──────────────────────────────────────────────────

  /**
   * Roll up data to a coarser interval (e.g., hourly → daily → weekly).
   * Uses downsampled readings at the finest available interval.
   */
  async rollup(query: RollupQuery): Promise<RollupResult> {
    const { sourceIds, from, to, rollupTo } = query;
    const bucketMs = ROLLUP_INTERVAL_MS[rollupTo] ?? 86_400_000;

    // Find the best source interval to use
    const intervalHierarchy = ['1m', '5m', '1h', '1d', '1w'];

    let sourceInterval = '1h'; // default fallback
    const requiredBucketMs = bucketMs / 4; // need at least 4x finer resolution

    for (const interval of intervalHierarchy) {
      const intervalMs = INTERVAL_MS[interval];
      if (intervalMs && intervalMs <= requiredBucketMs) {
        sourceInterval = interval;
        break;
      }
    }

    // Try downsampled first, fall back to raw
    const allBuckets: AggregatedBucket[] = [];

    for (const sourceId of sourceIds) {
      const downsampled = await db.downsampledReading.findMany({
        where: {
          sourceId,
          interval: sourceInterval,
          bucketStart: { gte: from, lte: to },
        },
        orderBy: { bucketStart: 'asc' },
      });

      if (downsampled.length > 0) {
        const buckets = new Map<string, Array<typeof downsampled[0]>>();

        for (const d of downsampled) {
          const bucketStart = Math.floor(d.bucketStart.getTime() / bucketMs) * bucketMs;
          const key = new Date(bucketStart).toISOString();
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(d);
        }

        for (const [key, dsReadings] of buckets) {
          const values = dsReadings.map(d => Number(d.avgValue));
          const sorted = [...values].sort((a, b) => a - b);
          const avg = values.reduce((s, v) => s + v, 0) / values.length;

          allBuckets.push({
            timestamp: key,
            sourceId,
            avg: Math.round(avg * 100) / 100,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            count: dsReadings.reduce((s, d) => s + d.count, 0),
            stdDev: Math.round(computeStdDev(values, avg) * 100) / 100,
            quality: dsReadings.reduce((s, d) => s + (d.quality ?? 100), 0) / dsReadings.length,
          });
        }
      } else {
        // Fall back to raw readings
        const raw = await db.telemetryReading.findMany({
          where: { sourceId, timestamp: { gte: from, lte: to } },
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
        });

        const buckets = new Map<string, number[]>();
        for (const r of raw) {
          const bucketStart = Math.floor(r.timestamp.getTime() / bucketMs) * bucketMs;
          const key = new Date(bucketStart).toISOString();
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(Number(r.value));
        }

        for (const [key, values] of buckets) {
          if (values.length === 0) continue;
          const sorted = [...values].sort((a, b) => a - b);
          const avg = values.reduce((s, v) => s + v, 0) / values.length;

          allBuckets.push({
            timestamp: key,
            sourceId,
            avg: Math.round(avg * 100) / 100,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            count: values.length,
            stdDev: Math.round(computeStdDev(values, avg) * 100) / 100,
            quality: 100,
          });
        }
      }
    }

    allBuckets.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.sourceId.localeCompare(b.sourceId));

    return { interval: rollupTo, data: allBuckets };
  },

  // ── Comparison Queries ──────────────────────────────────────────────

  /**
   * Compare current period statistics against the previous equivalent period.
   */
  async comparePeriods(query: ComparisonQuery): Promise<ComparisonResult> {
    const { sourceId, currentFrom, currentTo, lookbackPeriod = 'week' } = query;
    const durationMs = currentTo.getTime() - currentFrom.getTime();

    const previousTo = new Date(currentFrom.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);

    const [currentStats, previousStats] = await Promise.all([
      this.statisticalSummary(sourceId, currentFrom, currentTo),
      this.statisticalSummary(sourceId, previousFrom, previousTo),
    ]);

    const changePercent: Record<string, number> = {};
    const fieldsToCompare = ['avg', 'min', 'max', 'stdDev', 'p50', 'p95'] as const;

    for (const field of fieldsToCompare) {
      const prev = previousStats[field] as number;
      if (prev !== 0) {
        changePercent[field] = Math.round(((currentStats[field] as number - prev) / Math.abs(prev)) * 100 * 100) / 100;
      } else {
        changePercent[field] = 0;
      }
    }

    return { current: currentStats, previous: previousStats, changePercent };
  },

  // ── Statistical Summaries ───────────────────────────────────────────

  /**
   * Compute a comprehensive statistical summary for a source over a time range.
   */
  async statisticalSummary(sourceId: string, from: Date, to: Date): Promise<StatisticalSummary> {
    const cacheKey = `agg:stats:${sourceId}:${from.toISOString()}:${to.toISOString()}`;

    return cache.getOrSet(cacheKey, async () => {
      const readings = await db.telemetryReading.findMany({
        where: { sourceId, timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: 'asc' },
        select: { value: true },
      });

      const values = readings.map(r => Number(r.value));
      const sorted = [...values].sort((a, b) => a - b);
      const n = values.length;

      if (n === 0) {
        return {
          sourceId,
          count: 0,
          avg: 0, min: 0, max: 0, stdDev: 0,
          p5: 0, p25: 0, p50: 0, p75: 0, p95: 0,
          skewness: 0, kurtosis: 0,
        };
      }

      const avg = values.reduce((s, v) => s + v, 0) / n;
      const stdDev = computeStdDev(values, avg);

      return {
        sourceId,
        count: n,
        avg: Math.round(avg * 100) / 100,
        min: sorted[0],
        max: sorted[n - 1],
        stdDev: Math.round(stdDev * 100) / 100,
        p5: Math.round(percentile(sorted, 5) * 100) / 100,
        p25: Math.round(percentile(sorted, 25) * 100) / 100,
        p50: Math.round(percentile(sorted, 50) * 100) / 100,
        p75: Math.round(percentile(sorted, 75) * 100) / 100,
        p95: Math.round(percentile(sorted, 95) * 100) / 100,
        skewness: Math.round(computeSkewness(values, avg, stdDev) * 100) / 100,
        kurtosis: Math.round(computeKurtosis(values, avg, stdDev) * 100) / 100,
      };
    }, CACHE_TTL.MEDIUM);
  },

  /**
   * Compute batch statistical summaries for multiple sources.
   */
  async batchSummaries(sourceIds: string[], from: Date, to: Date): Promise<StatisticalSummary[]> {
    return Promise.all(
      sourceIds.map(sourceId => this.statisticalSummary(sourceId, from, to)),
    );
  },
};
