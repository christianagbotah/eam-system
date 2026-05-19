// ============================================================================
// TIME-SERIES SERVICE — Abstracted time-series data management
// Falls back to Prisma/SQLite when TimescaleDB/InfluxDB not available
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('timeSeries');

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  quality?: 'good' | 'uncertain' | 'bad';
  source?: string;
}

export interface TimeSeriesQuery {
  sourceId: string;
  from?: string;
  to?: string;
  interval?: string; // '1m', '5m', '1h', '1d'
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count' | 'last';
  limit?: number;
}

export interface TimeSeriesAggregated {
  bucket: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface DownsamplingConfig {
  rawRetentionDays: number;
  hourlyRetentionDays: number;
  dailyRetentionDays: number;
}

export class TimeSeriesService {
  /**
   * Write a single data point
   */
  static async write(sourceId: string, value: number, timestamp?: Date, quality: string = 'good'): Promise<void> {
    const ts = timestamp || new Date();

    try {
      await db.telemetryReading.create({
        data: {
          sourceId,
          value,
          quality: quality as 'good' | 'uncertain' | 'bad',
          timestamp: ts,
        },
      });

      // Invalidate cache
      cache.deleteByPrefix(`ts:${sourceId}`);
    } catch (error) {
      logger.error('Failed to write time-series point', { sourceId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Write multiple data points (batch)
   */
  static async writeBatch(points: Array<{ sourceId: string; value: number; timestamp?: Date; quality?: string }>): Promise<number> {
    if (points.length === 0) return 0;

    try {
      const result = await db.telemetryReading.createMany({
        data: points.map(p => ({
          sourceId: p.sourceId,
          value: p.value,
          quality: (p.quality || 'good') as 'good' | 'uncertain' | 'bad',
          timestamp: p.timestamp || new Date(),
        })),
        skipDuplicates: true,
      });

      // Invalidate caches
      const sourceIds = [...new Set(points.map(p => p.sourceId))];
      for (const id of sourceIds) {
        cache.deleteByPrefix(`ts:${id}`);
      }

      return result.count;
    } catch (error) {
      logger.error('Failed to write batch time-series points', { count: points.length });
      return 0;
    }
  }

  /**
   * Read raw time-series data
   */
  static async read(query: TimeSeriesQuery): Promise<TimeSeriesPoint[]> {
    const cacheKey = `ts:read:${query.sourceId}:${query.from || ''}:${query.to || ''}:${query.limit || 1000}`;

    return cache.getOrSet(cacheKey, async () => {
      const where: Record<string, unknown> = { sourceId: query.sourceId };

      if (query.from) where.timestamp = { ...where.timestamp as object, gte: new Date(query.from) };
      if (query.to) where.timestamp = { ...(where.timestamp || {}), lte: new Date(query.to) };

      const readings = await db.telemetryReading.findMany({
        where: Object.keys(where).length > 0 ? where : { sourceId: query.sourceId },
        orderBy: { timestamp: 'asc' },
        take: Math.min(query.limit || 1000, 10000),
      });

      return readings.map(r => ({
        timestamp: r.timestamp.toISOString(),
        value: Number(r.value),
        quality: r.quality as 'good' | 'uncertain' | 'bad',
      }));
    }, CACHE_TTL.SHORT);
  }

  /**
   * Read latest value for a source
   */
  static async readLatest(sourceId: string): Promise<TimeSeriesPoint | null> {
    const cacheKey = `ts:latest:${sourceId}`;

    return cache.getOrSet(cacheKey, async () => {
      const reading = await db.telemetryReading.findFirst({
        where: { sourceId },
        orderBy: { timestamp: 'desc' },
      });

      if (!reading) return null;

      return {
        timestamp: reading.timestamp.toISOString(),
        value: Number(reading.value),
        quality: reading.quality as 'good' | 'uncertain' | 'bad',
        source: sourceId,
      };
    }, CACHE_TTL.SHORT);
  }

  /**
   * Aggregate time-series data (simulated — in production uses TimescaleDB time_bucket)
   */
  static async aggregate(query: TimeSeriesQuery): Promise<TimeSeriesAggregated[]> {
    const aggFn = query.aggregation || 'avg';
    const raw = await this.read(query);

    if (raw.length === 0) return [];

    // Simple bucket aggregation
    const intervalMs = query.interval === '1m' ? 60000
      : query.interval === '5m' ? 300000
      : query.interval === '15m' ? 900000
      : query.interval === '1h' ? 3600000
      : query.interval === '1d' ? 86400000
      : 3600000;

    const buckets = new Map<string, number[]>();

    for (const point of raw) {
      const ts = new Date(point.timestamp).getTime();
      const bucketStart = Math.floor(ts / intervalMs) * intervalMs;
      const bucketKey = new Date(bucketStart).toISOString();

      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey)!.push(point.value);
    }

    const results: TimeSeriesAggregated[] = [];

    for (const [bucket, values] of buckets) {
      const sorted = values.sort((a, b) => a - b);
      results.push({
        bucket,
        avg: null,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
      });
    }

    // Compute actual aggregation
    for (const result of results) {
      const values = buckets.get(result.bucket)!;

      switch (aggFn) {
        case 'avg':
          result.avg = values.reduce((s, v) => s + v, 0) / values.length;
          break;
        case 'min':
          result.avg = Math.min(...values);
          break;
        case 'max':
          result.avg = Math.max(...values);
          break;
        case 'sum':
          result.avg = values.reduce((s, v) => s + v, 0);
          break;
        case 'count':
          result.avg = values.length;
          break;
        case 'last':
          result.avg = values[values.length - 1];
          break;
      }
    }

    return results;
  }

  /**
   * Get statistics for a time range
   */
  static async getStats(sourceId: string, from?: string, to?: string): Promise<{
    count: number;
    avg: number;
    min: number;
    max: number;
    stdDev: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
  }> {
    const readings = await this.read({ sourceId, from, to, limit: 50000 });

    if (readings.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, stdDev: 0, firstTimestamp: null, lastTimestamp: null };
    }

    const values = readings.map(r => r.value);
    const sum = values.reduce((s, v) => s + v, 0);
    const avg = sum / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;

    return {
      count: values.length,
      avg: Math.round(avg * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      firstTimestamp: readings[0].timestamp,
      lastTimestamp: readings[readings.length - 1].timestamp,
    };
  }

  /**
   * Delete old data (retention policy)
   */
  static async retain(sourceId: string, keepDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);

    try {
      const result = await db.telemetryReading.deleteMany({
        where: {
          sourceId,
          timestamp: { lt: cutoff },
        },
      });

      logger.info('Time-series retention applied', { sourceId, keepDays, deleted: result.count });
      cache.deleteByPrefix(`ts:${sourceId}`);
      return result.count;
    } catch (error) {
      logger.error('Retention policy failed', { sourceId, keepDays });
      return 0;
    }
  }

  /**
   * Get data source list with latest values
   */
  static async listSources(limit = 100): Promise<Array<{
    sourceId: string;
    latestValue: number | null;
    latestTimestamp: string | null;
    count: number;
  }>> {
    const cacheKey = `ts:sources:${limit}`;

    return cache.getOrSet(cacheKey, async () => {
      const recent = await db.telemetryReading.groupBy({
        by: ['sourceId'],
        orderBy: { timestamp: 'desc' },
        take: limit,
        _count: { id: true },
        _max: { timestamp: true },
      });

      return recent.map(r => ({
        sourceId: r.sourceId,
        latestValue: null,
        latestTimestamp: r._max.timestamp?.toISOString() || null,
        count: r._count.id,
      }));
    }, CACHE_TTL.MEDIUM);
  }
}
