// ============================================================================
// HISTORIAN DASHBOARD SERVICE — Real-time monitoring, data quality, storage,
// ingestion metrics, and top consumer analytics
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('historian:dashboard');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagMonitorOverview {
  sourceId: string;
  latestValue: number | null;
  latestTimestamp: string | null;
  quality: number | null;
  status: 'active' | 'stale' | 'inactive';
  readingsLastHour: number;
  trend: 'up' | 'down' | 'stable' | 'unknown';
}

export interface DataCompletenessMetrics {
  period: string;
  totalSources: number;
  activeSources: number;
  overallCompleteness: number; // percentage
  sourcesByCompleteness: Array<{
    sourceId: string;
    expectedCount: number;
    actualCount: number;
    completeness: number;
  }>;
}

export interface StorageUtilization {
  totalRawReadings: number;
  totalDownsampledReadings: number;
  estimatedRawBytes: number;
  estimatedDownsampledBytes: number;
  totalEstimatedBytes: number;
  formattedTotal: string;
  bySource: Array<{
    sourceId: string;
    rawCount: number;
    downsampledCount: number;
    percentageOfTotal: number;
  }>;
}

export interface IngestionRateMetrics {
  readingsPerSecond: number;
  readingsPerMinute: number;
  readingsPerHour: number;
  readingsToday: number;
  readingsLastHour: number;
  peakReadingsPerMinute: number;
  averageReadingsPerMinute: number;
}

export interface TopConsumerMetrics {
  sourceId: string;
  totalReadings: number;
  percentageOfTotal: number;
  avgReadingsPerDay: number;
  growthRate: number; // percentage change vs previous period
}

export interface AnomalySummary {
  totalActive: number;
  unacknowledged: number;
  bySeverity: Record<string, number>;
  bySource: Array<{
    sourceId: string;
    count: number;
    avgScore: number;
    latestAnomaly: string | null;
  }>;
}

export interface DataQualityScore {
  sourceId: string;
  overallScore: number;  // 0-100
  completenessScore: number;
  qualityScore: number;
  timelinessScore: number;
  consistencyScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface HistorianDashboardData {
  tagMonitor: TagMonitorOverview[];
  dataCompleteness: DataCompletenessMetrics;
  storage: StorageUtilization;
  ingestion: IngestionRateMetrics;
  topConsumers: TopConsumerMetrics[];
  anomalySummary: AnomalySummary;
  qualityScores: DataQualityScore[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const historianDashboardService = {

  // ── Main Dashboard ───────────────────────────────────────────────────

  /**
   * Get the complete historian dashboard data in a single call.
   */
  async getDashboard(): Promise<HistorianDashboardData> {
    const [tagMonitor, dataCompleteness, storage, ingestion, topConsumers, anomalySummary, qualityScores] = await Promise.all([
      this.getTagMonitorOverview(),
      this.getDataCompleteness(),
      this.getStorageUtilization(),
      this.getIngestionRates(),
      this.getTopConsumers(),
      this.getAnomalySummary(),
      this.getQualityScores(),
    ]);

    return {
      tagMonitor,
      dataCompleteness,
      storage,
      ingestion,
      topConsumers,
      anomalySummary,
      qualityScores,
      generatedAt: new Date().toISOString(),
    };
  },

  // ── Tag Monitor ─────────────────────────────────────────────────────

  /**
   * Get real-time monitoring overview for all active tags/sources.
   */
  async getTagMonitorOverview(): Promise<TagMonitorOverview[]> {
    const cacheKey = 'historian:tag-monitor';
    return cache.getOrSet(cacheKey, async () => {
      const oneHourAgo = new Date(Date.now() - 3600_000);
      const fourHoursAgo = new Date(Date.now() - 4 * 3600_000);

      // Get all sources with their latest reading and recent count
      const sourceGroups = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        _count: { id: true },
        _max: { timestamp: true },
        _min: { timestamp: true },
      });

      // Get readings per source in the last hour
      const recentCounts = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        where: { timestamp: { gte: oneHourAgo } },
        _count: { id: true },
      });

      // Get latest values
      const latestReadings = await Promise.all(
        sourceGroups.slice(0, 100).map(async (g) => {
          const latest = await db.telemetryReading.findFirst({
            where: { sourceId: g.sourceId },
            orderBy: { timestamp: 'desc' },
            select: { value: true, timestamp: true },
          });

          // Get a slightly older reading for trend detection
          const older = await db.telemetryReading.findFirst({
            where: {
              sourceId: g.sourceId,
              timestamp: { gte: fourHoursAgo, lt: new Date(Date.now() - 60_000) },
            },
            orderBy: { timestamp: 'desc' },
            select: { value: true },
          });

          return { sourceId: g.sourceId, latest, older };
        }),
      );

      const recentCountMap = new Map(recentCounts.map(r => [r.sourceId, r._count.id]));

      const overview: TagMonitorOverview[] = latestReadings.map(({ sourceId, latest, older }) => {
        const now = new Date();
        const lastTs = latest?.timestamp;
        const lastHourCount = recentCountMap.get(sourceId) ?? 0;

        let status: TagMonitorOverview['status'] = 'inactive';
        if (lastTs) {
          const ageMinutes = (now.getTime() - lastTs.getTime()) / 60_000;
          if (ageMinutes < 60) status = 'active';
          else if (ageMinutes < 240) status = 'stale';
        }

        let trend: TagMonitorOverview['trend'] = 'unknown';
        if (latest && older) {
          const diff = Number(latest.value) - Number(older.value);
          const threshold = Math.abs(Number(older.value)) * 0.01;
          if (diff > threshold) trend = 'up';
          else if (diff < -threshold) trend = 'down';
          else trend = 'stable';
        }

        return {
          sourceId,
          latestValue: latest ? Number(latest.value) : null,
          latestTimestamp: lastTs?.toISOString() ?? null,
          quality: 100,
          status,
          readingsLastHour: lastHourCount,
          trend,
        };
      });

      return overview;
    }, CACHE_TTL.SHORT);
  },

  // ── Data Completeness ───────────────────────────────────────────────

  /**
   * Calculate data completeness metrics (% of expected readings received).
   * Uses an expected rate of 1 reading per minute per source as baseline.
   */
  async getDataCompleteness(): Promise<DataCompletenessMetrics> {
    const cacheKey = 'historian:completeness';
    return cache.getOrSet(cacheKey, async () => {
      const oneHourAgo = new Date(Date.now() - 3600_000);

      const sourceGroups = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        _count: { id: true },
      });

      const recentCounts = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        where: { timestamp: { gte: oneHourAgo } },
        _count: { id: true },
      });

      const recentMap = new Map(recentCounts.map(r => [r.sourceId, r._count.id]));
      const expectedPerHour = 60; // assume 1 reading per minute

      const totalSources = sourceGroups.length;
      let totalExpected = 0;
      let totalActual = 0;
      const sourcesByCompleteness: DataCompletenessMetrics['sourcesByCompleteness'] = [];

      let activeSources = 0;

      for (const g of sourceGroups) {
        const actual = recentMap.get(g.sourceId) ?? 0;
        const expected = Math.min(expectedPerHour, g._count.id); // cap at what the source normally produces
        totalExpected += expectedPerHour;
        totalActual += actual;

        if (actual > 0) activeSources++;

        const completeness = Math.min(100, (actual / expectedPerHour) * 100);
        sourcesByCompleteness.push({
          sourceId: g.sourceId,
          expectedCount: expectedPerHour,
          actualCount: actual,
          completeness: Math.round(completeness * 10) / 10,
        });
      }

      sourcesByCompleteness.sort((a, b) => a.completeness - b.completeness);

      return {
        period: '1h',
        totalSources,
        activeSources,
        overallCompleteness: totalExpected > 0 ? Math.round((totalActual / totalExpected) * 1000) / 10 : 0,
        sourcesByCompleteness: sourcesByCompleteness.slice(0, 20), // top 20 worst
      };
    }, CACHE_TTL.MEDIUM);
  },

  // ── Storage Utilization ─────────────────────────────────────────────

  /**
   * Estimate storage utilization across raw and downsampled data.
   */
  async getStorageUtilization(): Promise<StorageUtilization> {
    const cacheKey = 'historian:storage';
    return cache.getOrSet(cacheKey, async () => {
      const [rawCounts, downsampledCounts] = await Promise.all([
        db.telemetryReading.groupBy({
          by: ['sourceId'],
          _count: { id: true },
        }),
        db.downsampledReading.groupBy({
          by: ['sourceId'],
          _count: { id: true },
        }),
      ]);

      const totalRawReadings = rawCounts.reduce((s, r) => s + r._count.id, 0);
      const totalDownsampledReadings = downsampledCounts.reduce((s, r) => s + r._count.id, 0);

      const estimatedRawBytes = totalRawReadings * 56;    // ~56 bytes per raw reading
      const estimatedDownsampledBytes = totalDownsampledReadings * 80; // ~80 bytes per downsampled

      const totalEstimatedBytes = estimatedRawBytes + estimatedDownsampledBytes;
      const total = totalRawReadings + totalDownsampledReadings;

      // Top consumers by source
      const sourceCombined = new Map<string, { raw: number; downsampled: number }>();

      for (const r of rawCounts) {
        const existing = sourceCombined.get(r.sourceId) ?? { raw: 0, downsampled: 0 };
        sourceCombined.set(r.sourceId, { ...existing, raw: r._count.id });
      }

      for (const d of downsampledCounts) {
        const existing = sourceCombined.get(d.sourceId) ?? { raw: 0, downsampled: 0 };
        sourceCombined.set(d.sourceId, { ...existing, downsampled: d._count.id });
      }

      const bySource = [...sourceCombined.entries()]
        .map(([sourceId, counts]) => ({
          sourceId,
          rawCount: counts.raw,
          downsampledCount: counts.downsampled,
          percentageOfTotal: total > 0 ? Math.round(((counts.raw + counts.downsampled) / total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => (b.rawCount + b.downsampledCount) - (a.rawCount + a.downsampledCount))
        .slice(0, 20);

      return {
        totalRawReadings,
        totalDownsampledReadings,
        estimatedRawBytes,
        estimatedDownsampledBytes,
        totalEstimatedBytes,
        formattedTotal: formatBytes(totalEstimatedBytes),
        bySource,
      };
    }, CACHE_TTL.MEDIUM);
  },

  // ── Ingestion Rates ─────────────────────────────────────────────────

  /**
   * Calculate current ingestion rate metrics.
   */
  async getIngestionRates(): Promise<IngestionRateMetrics> {
    const cacheKey = 'historian:ingestion';
    return cache.getOrSet(cacheKey, async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600_000);
      const oneDayAgo = new Date(now.getTime() - 86_400_000);

      const [lastHourCount, todayCount] = await Promise.all([
        db.telemetryReading.count({ where: { timestamp: { gte: oneHourAgo } } }),
        db.telemetryReading.count({ where: { timestamp: { gte: oneDayAgo } } }),
      ]);

      // Readings per second: use the last hour as a sample
      const readingsPerSecond = Math.round((lastHourCount / 3600) * 100) / 100;
      const readingsPerMinute = Math.round(lastHourCount / 60 * 100) / 100;
      const readingsPerHour = lastHourCount;
      const readingsToday = todayCount;

      // Peak readings per minute: check counts in 1-minute buckets over the last hour
      const recentReadings = await db.telemetryReading.findMany({
        where: { timestamp: { gte: oneHourAgo } },
        select: { timestamp: true },
        orderBy: { timestamp: 'asc' },
        take: 50000,
      });

      const minuteBuckets = new Map<string, number>();
      for (const r of recentReadings) {
        const key = new Date(Math.floor(r.timestamp.getTime() / 60_000) * 60_000).toISOString();
        minuteBuckets.set(key, (minuteBuckets.get(key) ?? 0) + 1);
      }

      const bucketCounts = [...minuteBuckets.values()];
      const peakReadingsPerMinute = bucketCounts.length > 0 ? Math.max(...bucketCounts) : 0;
      const averageReadingsPerMinute = bucketCounts.length > 0
        ? Math.round(bucketCounts.reduce((s, c) => s + c, 0) / bucketCounts.length * 100) / 100
        : 0;

      return {
        readingsPerSecond,
        readingsPerMinute,
        readingsPerHour,
        readingsToday,
        readingsLastHour: lastHourCount,
        peakReadingsPerMinute,
        averageReadingsPerMinute,
      };
    }, CACHE_TTL.SHORT);
  },

  // ── Top Consumers ───────────────────────────────────────────────────

  /**
   * Get sources with the most data (top consumers).
   */
  async getTopConsumers(): Promise<TopConsumerMetrics[]> {
    const cacheKey = 'historian:top-consumers';
    return cache.getOrSet(cacheKey, async () => {
      const sourceGroups = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        _count: { id: true },
        _min: { timestamp: true },
        _max: { timestamp: true },
      });

      const totalReadings = sourceGroups.reduce((s, r) => s + r._count.id, 0);

      const topConsumers: TopConsumerMetrics[] = sourceGroups
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 20)
        .map(g => {
          const minTs = g._min.timestamp;
          const maxTs = g._max.timestamp;
          const daysActive = minTs && maxTs
            ? Math.max(1, (maxTs.getTime() - minTs.getTime()) / 86_400_000)
            : 1;

          return {
            sourceId: g.sourceId,
            totalReadings: g._count.id,
            percentageOfTotal: totalReadings > 0
              ? Math.round((g._count.id / totalReadings) * 10000) / 100
              : 0,
            avgReadingsPerDay: Math.round(g._count.id / daysActive),
            growthRate: 0, // would need historical comparison for accurate growth
          };
        });

      return topConsumers;
    }, CACHE_TTL.MEDIUM);
  },

  // ── Anomaly Summary ─────────────────────────────────────────────────

  /**
   * Get anomaly summary for the dashboard.
   */
  async getAnomalySummary(): Promise<AnomalySummary> {
    const cacheKey = 'historian:anomaly-summary';
    return cache.getOrSet(cacheKey, async () => {
      const oneDayAgo = new Date(Date.now() - 86_400_000);

      const [totalActive, unacknowledged, bySource] = await Promise.all([
        db.anomalyRecord.count({
          where: { confirmed: true, detectedAt: { gte: oneDayAgo } },
        }),
        db.anomalyRecord.count({
          where: { confirmed: true, acknowledgedAt: null },
        }),
        db.anomalyRecord.groupBy({
          by: ['sourceId'],
          where: { confirmed: true, detectedAt: { gte: oneDayAgo } },
          _count: { id: true },
          _avg: { anomalyScore: true },
          _max: { detectedAt: true },
        }),
      ]);

      const severityCounts = await db.anomalyRecord.groupBy({
        by: ['severity'],
        where: { confirmed: true, detectedAt: { gte: oneDayAgo } },
        _count: { id: true },
      });

      const bySeverity: Record<string, number> = {};
      for (const s of severityCounts) {
        bySeverity[s.severity] = s._count.id;
      }

      return {
        totalActive,
        unacknowledged,
        bySeverity,
        bySource: bySource
          .sort((a, b) => b._count.id - a._count.id)
          .slice(0, 10)
          .map(r => ({
            sourceId: r.sourceId,
            count: r._count.id,
            avgScore: r._avg.anomalyScore ? Math.round(r._avg.anomalyScore * 100) / 100 : 0,
            latestAnomaly: r._max.detectedAt?.toISOString() ?? null,
          })),
      };
    }, CACHE_TTL.SHORT);
  },

  // ── Data Quality Scores ─────────────────────────────────────────────

  /**
   * Compute data quality scores for each source.
   * Considers completeness, quality values, timeliness, and consistency.
   */
  async getQualityScores(): Promise<DataQualityScore[]> {
    const cacheKey = 'historian:quality-scores';
    return cache.getOrSet(cacheKey, async () => {
      const oneHourAgo = new Date(Date.now() - 3600_000);
      const oneDayAgo = new Date(Date.now() - 86_400_000);

      const sourceGroups = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        _count: { id: true },
        _max: { timestamp: true },
      });

      const recentCounts = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        where: { timestamp: { gte: oneHourAgo } },
        _count: { id: true },
      });

      const anomalyCounts = await db.anomalyRecord.groupBy({
        by: ['sourceId'],
        where: { detectedAt: { gte: oneDayAgo } },
        _count: { id: true },
      });

      const recentMap = new Map(recentCounts.map(r => [r.sourceId, r._count.id]));
      const anomalyMap = new Map(anomalyCounts.map(r => [r.sourceId, r._count.id]));

      const scores: DataQualityScore[] = sourceGroups.map(g => {
        const recentCount = recentMap.get(g.sourceId) ?? 0;

        // Completeness: expected 60 readings/hour
        const completenessScore = Math.min(100, (recentCount / 60) * 100);

        // Quality: assume 100 if no bad quality readings detected (simplified)
        const qualityScore = 100;

        // Timeliness: based on age of latest reading
        const latestTs = g._max.timestamp;
        let timelinessScore = 100;
        if (latestTs) {
          const ageMinutes = (Date.now() - latestTs.getTime()) / 60_000;
          if (ageMinutes > 240) timelinessScore = 0;
          else if (ageMinutes > 60) timelinessScore = Math.max(0, 100 - (ageMinutes - 60));
        } else {
          timelinessScore = 0;
        }

        // Consistency: inversely proportional to anomaly count
        const anomalyCount = anomalyMap.get(g.sourceId) ?? 0;
        const consistencyScore = Math.max(0, 100 - anomalyCount * 10);

        const overallScore = (completenessScore * 0.35) + (qualityScore * 0.25) + (timelinessScore * 0.25) + (consistencyScore * 0.15);

        return {
          sourceId: g.sourceId,
          overallScore: Math.round(overallScore * 10) / 10,
          completenessScore: Math.round(completenessScore * 10) / 10,
          qualityScore: Math.round(qualityScore * 10) / 10,
          timelinessScore: Math.round(timelinessScore * 10) / 10,
          consistencyScore: Math.round(consistencyScore * 10) / 10,
          grade: computeGrade(overallScore),
        };
      });

      return scores.sort((a, b) => a.overallScore - b.overallScore);
    }, CACHE_TTL.MEDIUM);
  },
};
