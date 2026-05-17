// ============================================================================
// ANOMALY DETECTION PIPELINE — Multi-method anomaly detection with scoring
// Statistical (z-score, modified z-score), IQR, EMA deviation, rate-of-change,
// pattern deviation, configurable thresholds, false positive filtering
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('historian:anomaly');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalyMethod = 'zscore' | 'modified_zscore' | 'iqr' | 'ema' | 'rate_of_change' | 'pattern';
export type AnomalySeverity = 'low' | 'warning' | 'high' | 'critical';

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;        // 0-100
  severity: AnomalySeverity;
  expectedValue: number;
  method: string;
  details: Record<string, unknown>;
}

export interface AnomalyConfigData {
  sourceId?: string;
  mappingId?: string;
  method?: AnomalyMethod;
  windowSize?: number;
  threshold?: number;
  cooldownMinutes?: number;
  confirmationCount?: number;
  config?: Record<string, unknown>;
}

export interface AnomalyTrend {
  sourceId: string;
  period: string;
  totalAnomalies: number;
  bySeverity: Record<string, number>;
  byMethod: Record<string, number>;
  trend: 'increasing' | 'stable' | 'decreasing';
  changePercent: number;
}

export interface AnomalyHistoryQuery {
  sourceId?: string;
  from?: Date;
  to?: Date;
  severity?: AnomalySeverity;
  confirmed?: boolean;
  method?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// In-memory state for false-positive filtering
// ---------------------------------------------------------------------------

/** Per-source cooldown tracking: sourceId → last anomaly timestamp */
const cooldownTracker = new Map<string, Date>();

/** Per-source pending confirmations: sourceId → consecutive anomaly count */
const confirmationTracker = new Map<string, { count: number; lastValue: number; lastExpected: number; lastScore: number }>();

// ---------------------------------------------------------------------------
// Detection Methods
// ---------------------------------------------------------------------------

/**
 * Z-Score anomaly detection: flags values that are N standard deviations from the mean.
 */
function detectZScore(values: number[], currentValue: number, threshold: number): AnomalyDetectionResult {
  const n = values.length;
  if (n < 3) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'zscore', details: { reason: 'insufficient_data' } };
  }

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: mean, method: 'zscore', details: { reason: 'zero_variance' } };
  }

  const zScore = Math.abs(currentValue - mean) / stdDev;
  const isAnomaly = zScore > threshold;
  const score = Math.min(100, (zScore / threshold) * 50);

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: Math.round(mean * 100) / 100,
    method: 'zscore',
    details: { zScore: Math.round(zScore * 100) / 100, mean: Math.round(mean * 100) / 100, stdDev: Math.round(stdDev * 100) / 100, threshold },
  };
}

/**
 * Modified Z-Score: uses median absolute deviation (MAD) for robustness against outliers.
 */
function detectModifiedZScore(values: number[], currentValue: number, threshold: number): AnomalyDetectionResult {
  const n = values.length;
  if (n < 3) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'modified_zscore', details: { reason: 'insufficient_data' } };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  const deviations = sorted.map(v => Math.abs(v - median));
  const mad = deviations[Math.floor(n / 2)];

  if (mad === 0) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: median, method: 'modified_zscore', details: { reason: 'zero_mad' } };
  }

  const modifiedZ = 0.6745 * Math.abs(currentValue - median) / mad;
  const isAnomaly = modifiedZ > threshold;
  const score = Math.min(100, (modifiedZ / threshold) * 50);

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: Math.round(median * 100) / 100,
    method: 'modified_zscore',
    details: { modifiedZ: Math.round(modifiedZ * 100) / 100, median: Math.round(median * 100) / 100, mad: Math.round(mad * 100) / 100, threshold },
  };
}

/**
 * IQR-based anomaly detection: flags values outside Q1 - k*IQR or Q3 + k*IQR.
 */
function detectIQR(values: number[], currentValue: number, threshold: number): AnomalyDetectionResult {
  const n = values.length;
  if (n < 4) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'iqr', details: { reason: 'insufficient_data' } };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  if (iqr === 0) {
    const median = sorted[Math.floor(n / 2)];
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: median, method: 'iqr', details: { reason: 'zero_iqr' } };
  }

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;
  const isAnomaly = currentValue < lowerBound || currentValue > upperBound;

  let score = 0;
  if (isAnomaly) {
    const distance = currentValue < lowerBound
      ? (lowerBound - currentValue) / iqr
      : (currentValue - upperBound) / iqr;
    score = Math.min(100, 30 + distance * 20);
  }

  const median = sorted[Math.floor(n / 2)];

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: Math.round(median * 100) / 100,
    method: 'iqr',
    details: { q1: Math.round(q1 * 100) / 100, q3: Math.round(q3 * 100) / 100, iqr: Math.round(iqr * 100) / 100, lowerBound: Math.round(lowerBound * 100) / 100, upperBound: Math.round(upperBound * 100) / 100, threshold },
  };
}

/**
 * EMA deviation: compares value against exponential moving average baseline.
 */
function detectEMA(values: number[], currentValue: number, threshold: number, config?: Record<string, unknown>): AnomalyDetectionResult {
  const n = values.length;
  if (n < 3) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'ema', details: { reason: 'insufficient_data' } };
  }

  const alpha = (config?.alpha as number) ?? 0.3; // smoothing factor
  let ema = values[0];
  for (let i = 1; i < n; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }

  const deviation = Math.abs(currentValue - ema);
  const avgDeviation = values.reduce((s, v) => s + Math.abs(v - ema), 0) / n;
  const normalizedDeviation = avgDeviation > 0 ? deviation / avgDeviation : 0;

  const isAnomaly = normalizedDeviation > threshold;
  const score = Math.min(100, normalizedDeviation * 30);

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: Math.round(ema * 100) / 100,
    method: 'ema',
    details: { ema: Math.round(ema * 100) / 100, deviation: Math.round(deviation * 100) / 100, normalizedDeviation: Math.round(normalizedDeviation * 100) / 100, alpha, threshold },
  };
}

/**
 * Rate-of-change detection: flags sudden value changes.
 */
function detectRateOfChange(values: number[], currentValue: number, threshold: number): AnomalyDetectionResult {
  const n = values.length;
  if (n < 2) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'rate_of_change', details: { reason: 'insufficient_data' } };
  }

  const previousValue = values[n - 1];
  const rateOfChange = previousValue !== 0 ? Math.abs((currentValue - previousValue) / Math.abs(previousValue)) * 100 : 0;

  // Calculate typical rate of change from history
  const typicalRates: number[] = [];
  for (let i = 1; i < n; i++) {
    if (values[i - 1] !== 0) {
      typicalRates.push(Math.abs((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100);
    }
  }

  const avgRate = typicalRates.length > 0 ? typicalRates.reduce((s, v) => s + v, 0) / typicalRates.length : 0;
  const isAnomaly = avgRate > 0 ? rateOfChange > threshold * avgRate : rateOfChange > threshold * 10;

  const score = isAnomaly ? Math.min(100, (rateOfChange / (avgRate || 1)) * 20) : 0;

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: previousValue,
    method: 'rate_of_change',
    details: { rateOfChange: Math.round(rateOfChange * 100) / 100, avgRate: Math.round(avgRate * 100) / 100, previousValue: Math.round(previousValue * 100) / 100, threshold },
  };
}

/**
 * Pattern deviation: compares current value against a time-of-day / day-of-week baseline.
 */
function detectPatternDeviation(
  values: number[],
  currentValue: number,
  currentTimestamp: Date,
  threshold: number,
): AnomalyDetectionResult {
  const n = values.length;
  if (n < 10) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: currentValue, method: 'pattern', details: { reason: 'insufficient_data' } };
  }

  // Extract baseline values for the same hour-of-day from history
  const currentHour = currentTimestamp.getHours();
  const currentDow = currentTimestamp.getDay();

  // For simplicity, compare against values at similar positions in the window
  // (This is a simplified pattern matching — production would use FFT or similar)
  const similarValues = values.filter((_, i) => {
    // Simulate by picking values at roughly the same position in the window
    return i % 24 === currentHour;
  });

  if (similarValues.length < 2) {
    const avg = values.reduce((s, v) => s + v, 0) / n;
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: Math.round(avg * 100) / 100, method: 'pattern', details: { reason: 'insufficient_pattern_data' } };
  }

  const patternAvg = similarValues.reduce((s, v) => s + v, 0) / similarValues.length;
  const patternStdDev = Math.sqrt(similarValues.reduce((s, v) => s + (v - patternAvg) ** 2, 0) / similarValues.length);

  if (patternStdDev === 0) {
    return { isAnomaly: false, score: 0, severity: 'low', expectedValue: Math.round(patternAvg * 100) / 100, method: 'pattern', details: { reason: 'zero_pattern_variance' } };
  }

  const deviation = Math.abs(currentValue - patternAvg) / patternStdDev;
  const isAnomaly = deviation > threshold;
  const score = Math.min(100, deviation * 25);

  return {
    isAnomaly,
    score: Math.round(score * 10) / 10,
    severity: classifySeverity(score),
    expectedValue: Math.round(patternAvg * 100) / 100,
    method: 'pattern',
    details: { deviation: Math.round(deviation * 100) / 100, patternAvg: Math.round(patternAvg * 100) / 100, patternStdDev: Math.round(patternStdDev * 100) / 100, currentHour, currentDow, baselineSamples: similarValues.length, threshold },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifySeverity(score: number): AnomalySeverity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'warning';
  return 'low';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const anomalyPipelineService = {

  // ── Configuration Management ─────────────────────────────────────────

  /**
   * List all anomaly detection configurations.
   */
  async listConfigs() {
    return db.anomalyDetectionConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get anomaly detection config for a specific source or mapping.
   */
  async getConfig(sourceId?: string, mappingId?: string) {
    if (mappingId) {
      return db.anomalyDetectionConfig.findFirst({ where: { mappingId, isActive: true } });
    }
    if (sourceId) {
      return db.anomalyDetectionConfig.findFirst({ where: { sourceId, isActive: true } });
    }
    // Global default
    return db.anomalyDetectionConfig.findFirst({ where: { sourceId: null, mappingId: null, isActive: true } });
  },

  /**
   * Create or update an anomaly detection configuration.
   */
  async upsertConfig(data: AnomalyConfigData) {
    const existing = data.mappingId
      ? await db.anomalyDetectionConfig.findFirst({ where: { mappingId: data.mappingId } })
      : data.sourceId
        ? await db.anomalyDetectionConfig.findFirst({ where: { sourceId: data.sourceId, mappingId: null } })
        : await db.anomalyDetectionConfig.findFirst({ where: { sourceId: null, mappingId: null } });

    if (existing) {
      return db.anomalyDetectionConfig.update({
        where: { id: existing.id },
        data: {
          method: data.method || existing.method,
          windowSize: data.windowSize ?? existing.windowSize,
          threshold: data.threshold ?? existing.threshold,
          cooldownMinutes: data.cooldownMinutes ?? existing.cooldownMinutes,
          confirmationCount: data.confirmationCount ?? existing.confirmationCount,
          config: data.config ?? existing.config ?? undefined,
        },
      });
    }

    return db.anomalyDetectionConfig.create({
      data: {
        sourceId: data.sourceId ?? null,
        mappingId: data.mappingId ?? null,
        method: data.method || 'zscore',
        windowSize: data.windowSize ?? 30,
        threshold: data.threshold ?? 3,
        cooldownMinutes: data.cooldownMinutes ?? 15,
        confirmationCount: data.confirmationCount ?? 2,
        config: data.config ?? undefined,
      },
    });
  },

  /**
   * Delete an anomaly detection configuration.
   */
  async deleteConfig(id: string) {
    return db.anomalyDetectionConfig.delete({ where: { id } });
  },

  // ── Core Detection ───────────────────────────────────────────────────

  /**
   * Run anomaly detection for a source. Fetches recent readings and applies configured method.
   */
  async detect(sourceId: string, currentValue: number, currentTimestamp?: Date): Promise<AnomalyDetectionResult | null> {
    const config = await this.getConfig(sourceId);
    if (!config) return null;

    const ts = currentTimestamp || new Date();

    // Check cooldown
    const lastAnomaly = cooldownTracker.get(sourceId);
    if (lastAnomaly) {
      const cooldownMs = config.cooldownMinutes * 60_000;
      if (ts.getTime() - lastAnomaly.getTime() < cooldownMs) {
        return null;
      }
    }

    // Fetch historical readings for baseline
    const windowStart = new Date(ts.getTime() - config.windowSize * 60_000);
    const readings = await db.telemetryReading.findMany({
      where: {
        sourceId,
        timestamp: { gte: windowStart, lt: ts },
      },
      orderBy: { timestamp: 'asc' },
      select: { value: true },
      take: config.windowSize * 2, // get extra in case of gaps
    });

    const values = readings.map(r => Number(r.value));
    const methodConfig = config.config as Record<string, unknown> | null;

    // Run the appropriate detection method
    let result: AnomalyDetectionResult;

    switch (config.method) {
      case 'modified_zscore':
        result = detectModifiedZScore(values, currentValue, config.threshold);
        break;
      case 'iqr':
        result = detectIQR(values, currentValue, config.threshold);
        break;
      case 'ema':
        result = detectEMA(values, currentValue, config.threshold, methodConfig ?? undefined);
        break;
      case 'rate_of_change':
        result = detectRateOfChange(values, currentValue, config.threshold);
        break;
      case 'pattern':
        result = detectPatternDeviation(values, currentValue, ts, config.threshold);
        break;
      case 'zscore':
      default:
        result = detectZScore(values, currentValue, config.threshold);
        break;
    }

    if (!result.isAnomaly) {
      // Reset confirmation counter on non-anomaly
      confirmationTracker.delete(sourceId);
      return result;
    }

    // Confirmation window: require N consecutive anomalies
    const confirmation = confirmationTracker.get(sourceId);
    if (confirmation) {
      confirmation.count++;
      confirmation.lastValue = currentValue;
      confirmation.lastExpected = result.expectedValue;
      confirmation.lastScore = result.score;
    } else {
      confirmationTracker.set(sourceId, {
        count: 1,
        lastValue: currentValue,
        lastExpected: result.expectedValue,
        lastScore: result.score,
      });
    }

    const currentConfirmation = confirmationTracker.get(sourceId)!;

    if (currentConfirmation.count < config.confirmationCount) {
      // Not yet confirmed — return anomaly but don't record
      return {
        ...result,
        confirmed: false,
        score: result.score * 0.5, // reduce score for unconfirmed
        details: { ...result.details, confirmationProgress: `${currentConfirmation.count}/${config.confirmationCount}` },
      };
    }

    // Anomaly confirmed! Record it
    cooldownTracker.set(sourceId, ts);
    confirmationTracker.delete(sourceId);

    await this.recordAnomaly({
      sourceId,
      mappingId: config.mappingId ?? undefined,
      method: config.method,
      value: currentValue,
      expectedValue: result.expectedValue,
      anomalyScore: result.score,
      severity: result.severity,
      metadata: result.details,
    });

    return result;
  },

  /**
   * Record a confirmed anomaly to the database.
   */
  async recordAnomaly(data: {
    sourceId: string;
    mappingId?: string;
    method: string;
    value: number;
    expectedValue: number;
    anomalyScore: number;
    severity: AnomalySeverity;
    metadata?: Record<string, unknown>;
  }) {
    const record = await db.anomalyRecord.create({
      data: {
        sourceId: data.sourceId,
        mappingId: data.mappingId ?? null,
        method: data.method,
        value: data.value,
        expectedValue: data.expectedValue,
        anomalyScore: data.anomalyScore,
        severity: data.severity,
        confirmed: true,
        metadata: data.metadata ?? undefined,
      },
    });

    logger.warn('Anomaly detected and recorded', {
      sourceId: data.sourceId,
      method: data.method,
      score: data.anomalyScore,
      severity: data.severity,
      value: data.value,
      expected: data.expectedValue,
    });

    return record;
  },

  // ── Query Anomaly History ────────────────────────────────────────────

  /**
   * Query anomaly records with filters and pagination.
   */
  async queryHistory(query: AnomalyHistoryQuery) {
    const where: Record<string, unknown> = {};

    if (query.sourceId) where.sourceId = query.sourceId;
    if (query.from || query.to) {
      const timestampFilter: Record<string, unknown> = {};
      if (query.from) timestampFilter.gte = query.from;
      if (query.to) timestampFilter.lte = query.to;
      where.detectedAt = timestampFilter;
    }
    if (query.severity) where.severity = query.severity;
    if (query.confirmed !== undefined) where.confirmed = query.confirmed;
    if (query.method) where.method = query.method;

    const [records, total] = await Promise.all([
      db.anomalyRecord.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      db.anomalyRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        total,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      },
    };
  },

  /**
   * Get anomaly trend analysis for a source over the past N days.
   */
  async getTrend(sourceId: string, days = 30): Promise<AnomalyTrend> {
    const from = new Date(Date.now() - days * 86_400_000);

    const records = await db.anomalyRecord.findMany({
      where: { sourceId, detectedAt: { gte: from } },
    });

    const bySeverity: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    for (const record of records) {
      bySeverity[record.severity] = (bySeverity[record.severity] || 0) + 1;
      byMethod[record.method] = (byMethod[record.method] || 0) + 1;
    }

    // Compare recent vs older half to determine trend direction
    const midPoint = new Date(from.getTime() + (days * 86_400_000) / 2);
    const recentCount = records.filter(r => r.detectedAt >= midPoint).length;
    const olderCount = records.filter(r => r.detectedAt < midPoint).length;

    let trend: 'increasing' | 'stable' | 'decreasing';
    let changePercent = 0;

    if (olderCount > 0) {
      changePercent = Math.round(((recentCount - olderCount) / olderCount) * 100);
      trend = changePercent > 10 ? 'increasing' : changePercent < -10 ? 'decreasing' : 'stable';
    } else {
      trend = recentCount > 0 ? 'increasing' : 'stable';
    }

    return {
      sourceId,
      period: `${days}d`,
      totalAnomalies: records.length,
      bySeverity,
      byMethod,
      trend,
      changePercent,
    };
  },

  /**
   * Acknowledge an anomaly record.
   */
  async acknowledgeAnomaly(id: string, userId: string) {
    return db.anomalyRecord.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
      },
    });
  },

  /**
   * Get anomaly summary across all sources for dashboard display.
   */
  async getSummary() {
    const cacheKey = 'anomaly:summary';
    return cache.getOrSet(cacheKey, async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600_000);
      const oneDayAgo = new Date(now.getTime() - 86_400_000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000);

      const [lastHour, lastDay, lastWeek, bySource] = await Promise.all([
        db.anomalyRecord.count({ where: { detectedAt: { gte: oneHourAgo } } }),
        db.anomalyRecord.count({ where: { detectedAt: { gte: oneDayAgo } } }),
        db.anomalyRecord.count({ where: { detectedAt: { gte: oneWeekAgo } } }),
        db.anomalyRecord.groupBy({
          by: ['sourceId'],
          where: { detectedAt: { gte: oneDayAgo } },
          _count: { id: true },
          _max: { anomalyScore: true },
        }),
      ]);

      const unacknowledged = await db.anomalyRecord.count({
        where: { acknowledgedAt: null, confirmed: true },
      });

      return {
        lastHour,
        lastDay,
        lastWeek,
        unacknowledged,
        topSources: bySource
          .sort((a, b) => b._count.id - a._count.id)
          .slice(0, 10)
          .map(r => ({ sourceId: r.sourceId, count: r._count.id, maxScore: r._max.anomalyScore })),
      };
    }, CACHE_TTL.SHORT);
  },
};
