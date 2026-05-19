// ============================================================================
// PREDICTIVE MAINTENANCE ENGINE — Failure prediction, RUL, anomaly detection
// Uses LLM skill for intelligent analysis via z-ai-web-dev-sdk on the backend
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';
import { TimeSeriesService } from '@/services/timeSeries.service';

const logger = createLogger('predictiveEngine');

// ============================================================================
// Types
// ============================================================================

export interface HealthScore {
  assetId: string;
  score: number; // 0-100
  level: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  factors: HealthFactor[];
  updatedAt: string;
}

export interface HealthFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface FailurePrediction {
  assetId: string;
  assetName: string;
  probability: number; // 0-1
  timeHorizon: string; // '7d', '30d', '90d'
  confidence: number; // 0-1
  predictedFailureMode: string;
  recommendedAction: string;
  contributingFactors: string[];
  lastAnalysis: string;
}

export interface AnomalyDetection {
  sourceId: string;
  timestamp: string;
  value: number;
  expectedRange: { min: number; max: number };
  deviation: number; // standard deviations from mean
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'drift' | 'noise';
}

export interface MaintenanceOptimization {
  assetId: string;
  currentStrategy: string;
  recommendedStrategy: string;
  estimatedSavings: number; // percentage
  nextMaintenanceDate: string;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Health Score Calculation Engine
// ============================================================================

export class PredictiveEngine {
  /**
   * Calculate composite health score for an asset
   */
  static async calculateHealthScore(assetId: string): Promise<HealthScore> {
    const cacheKey = `health:${assetId}`;

    return cache.getOrSet(cacheKey, async () => {
      const factors: HealthFactor[] = [];

      // Factor 1: Asset age (newer = better)
      const asset = await db.asset.findUnique({
        where: { id: assetId },
        select: { id: true, name: true, installedDate: true, status: true, criticality: true, condition: true },
      });

      if (!asset) {
        return { assetId, score: 0, level: 'critical', factors: [{ name: 'Not Found', weight: 1, score: 0, description: 'Asset does not exist' }], updatedAt: new Date().toISOString() };
      }

      // Age factor (0-100)
      if (asset.installedDate) {
        const ageYears = (Date.now() - new Date(asset.installedDate).getTime()) / (365.25 * 86400000);
        const ageScore = Math.max(0, Math.min(100, 100 - (ageYears * 5))); // Lose 5 points per year
        factors.push({ name: 'Asset Age', weight: 0.15, score: Math.round(ageScore), description: `Installed ${Math.round(ageYears)} years ago` });
      }

      // Condition factor (0-100)
      const conditionScores: Record<string, number> = { new: 100, good: 85, fair: 60, poor: 35, out_of_service: 10, critical: 10 };
      const conditionScore = conditionScores[asset.condition || 'good'] || 70;
      factors.push({ name: 'Physical Condition', weight: 0.25, score: conditionScore, description: `Condition: ${asset.condition || 'unknown'}` });

      // Criticality factor
      const criticalityScores: Record<string, number> = { low: 90, medium: 75, high: 60, critical: 40 };
      const critScore = criticalityScores[asset.criticality || 'medium'] || 70;
      factors.push({ name: 'Risk Criticality', weight: 0.2, score: critScore, description: `Criticality: ${asset.criticality || 'medium'}` });

      // Work order history factor
      try {
        const recentWOs = await db.workOrder.count({
          where: { assetId, createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        });
        const woScore = Math.max(0, 100 - (recentWOs * 10));
        factors.push({ name: 'Maintenance Frequency', weight: 0.2, score: woScore, description: `${recentWOs} WOs in last 90 days` });
      } catch {
        factors.push({ name: 'Maintenance Frequency', weight: 0.2, score: 70, description: 'Data unavailable' });
      }

      // Failure history factor
      try {
        const recentFailures = await db.failureRecord.count({
          where: { assetId, createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
        });
        const failureScore = Math.max(0, 100 - (recentFailures * 15));
        factors.push({ name: 'Failure History', weight: 0.2, score: failureScore, description: `${recentFailures} failures in last year` });
      } catch {
        factors.push({ name: 'Failure History', weight: 0.2, score: 80, description: 'No failure data' });
      }

      // Calculate weighted composite score
      let totalWeight = 0;
      let weightedScore = 0;
      for (const f of factors) {
        weightedScore += f.score * f.weight;
        totalWeight += f.weight;
      }
      const compositeScore = Math.round(weightedScore / (totalWeight || 1));

      const level = compositeScore >= 80 ? 'excellent'
        : compositeScore >= 60 ? 'good'
        : compositeScore >= 40 ? 'fair'
        : compositeScore >= 20 ? 'poor'
        : 'critical';

      return {
        assetId,
        score: compositeScore,
        level,
        factors,
        updatedAt: new Date().toISOString(),
      };
    }, CACHE_TTL.MEDIUM);
  }

  /**
   * Predict failure probability for an asset
   */
  static async predictFailure(assetId: string): Promise<FailurePrediction> {
    const cacheKey = `prediction:${assetId}`;

    return cache.getOrSet(cacheKey, async () => {
      const asset = await db.asset.findUnique({
        where: { id: assetId },
        select: { id: true, name: true, condition: true, criticality: true, categoryId: true },
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      const health = await this.calculateHealthScore(assetId);

      // Calculate failure probability based on health score
      // Inverse relationship: lower health = higher failure probability
      const baseProbability = Math.max(0.01, Math.min(0.95, (100 - health.score) / 100));

      // Adjust by criticality
      const critMultiplier = asset.criticality === 'critical' ? 1.3
        : asset.criticality === 'high' ? 1.15
        : asset.criticality === 'medium' ? 1.0
        : 0.9;

      const probability = Math.min(0.95, baseProbability * critMultiplier);

      // Time horizon based on probability
      const timeHorizon = probability > 0.7 ? '7d'
        : probability > 0.4 ? '30d'
        : '90d';

      // Confidence based on data availability
      const confidence = 0.6 + (health.factors.length / 10) * 0.3;

      // Determine most likely failure mode from condition
      const failureModes: Record<string, string> = {
        poor: 'Mechanical wear / fatigue',
        out_of_service: 'Structural degradation',
        critical: 'Structural degradation',
        fair: 'Performance degradation',
        good: 'Normal aging',
        new: 'Infant mortality risk',
      };

      const recommendations: Record<string, string> = {
        poor: 'Immediate inspection and preventive replacement recommended',
        out_of_service: 'Equipment out of service — assess before re-commissioning',
        critical: 'Emergency maintenance required — schedule shutdown',
        fair: 'Schedule preventive maintenance within 2 weeks',
        good: 'Continue monitoring — standard PM schedule sufficient',
        new: 'Enhanced monitoring during break-in period',
      };

      return {
        assetId,
        assetName: asset.name,
        probability: Math.round(probability * 100) / 100,
        timeHorizon,
        confidence: Math.round(confidence * 100) / 100,
        predictedFailureMode: failureModes[asset.condition || 'good'] || 'Unknown',
        recommendedAction: recommendations[asset.condition || 'good'] || 'Monitor and maintain',
        contributingFactors: health.factors.filter(f => f.score < 60).map(f => `${f.name}: ${f.description}`),
        lastAnalysis: new Date().toISOString(),
      };
    }, CACHE_TTL.LONG);
  }

  /**
   * Detect anomalies in time-series data
   */
  static async detectAnomalies(sourceId: string, lookbackHours: number = 24): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      const from = new Date(Date.now() - lookbackHours * 3600000).toISOString();
      const stats = await TimeSeriesService.getStats(sourceId, from);

      if (stats.count < 10) return anomalies;

      // Calculate standard deviation based threshold
      const mean = stats.avg;
      const stdDev = stats.stdDev;
      const upperThreshold = mean + 3 * stdDev;
      const lowerThreshold = mean - 3 * stdDev;

      // Get raw data for point-by-point analysis
      const data = await TimeSeriesService.read({ sourceId, from, limit: 5000 });

      for (const point of data) {
        if (point.value > upperThreshold) {
          const deviation = stdDev > 0 ? (point.value - mean) / stdDev : 0;
          anomalies.push({
            sourceId,
            timestamp: point.timestamp,
            value: point.value,
            expectedRange: { min: Math.round(lowerThreshold * 100) / 100, max: Math.round(upperThreshold * 100) / 100 },
            deviation: Math.round(deviation * 100) / 100,
            severity: deviation > 5 ? 'critical' : deviation > 4 ? 'high' : deviation > 3 ? 'medium' : 'low',
            type: 'spike',
          });
        } else if (point.value < lowerThreshold && stdDev > 0) {
          const deviation = stdDev > 0 ? (mean - point.value) / stdDev : 0;
          anomalies.push({
            sourceId,
            timestamp: point.timestamp,
            value: point.value,
            expectedRange: { min: Math.round(lowerThreshold * 100) / 100, max: Math.round(upperThreshold * 100) / 100 },
            deviation: Math.round(deviation * 100) / 100,
            severity: deviation > 5 ? 'critical' : deviation > 4 ? 'high' : deviation > 3 ? 'medium' : 'low',
            type: 'drop',
          });
        }
      }
    } catch (error) {
      logger.error('Anomaly detection failed', { sourceId, error });
    }

    return anomalies.sort((a, b) => b.deviation - a.deviation);
  }

  /**
   * Optimize maintenance strategy for an asset
   */
  static async optimizeMaintenance(assetId: string): Promise<MaintenanceOptimization> {
    const health = await this.calculateHealthScore(assetId);
    const prediction = await this.predictFailure(assetId).catch(() => null);

    let currentStrategy = 'reactive';
    let recommendedStrategy = 'preventive';
    let estimatedSavings = 15;
    let nextMaintenanceDate = new Date(Date.now() + 30 * 86400000).toISOString();
    let reasoning = '';

    if (health.score >= 80) {
      currentStrategy = 'condition-based';
      recommendedStrategy = 'condition-based';
      estimatedSavings = 25;
      nextMaintenanceDate = new Date(Date.now() + 90 * 86400000).toISOString();
      reasoning = 'Asset health is excellent. Continue condition-based monitoring with extended PM intervals.';
    } else if (health.score >= 60) {
      currentStrategy = 'preventive';
      recommendedStrategy = 'predictive';
      estimatedSavings = 20;
      nextMaintenanceDate = new Date(Date.now() + 45 * 86400000).toISOString();
      reasoning = 'Asset health is good. Transition to predictive strategy to optimize maintenance timing and reduce unnecessary PMs.';
    } else if (health.score >= 40) {
      currentStrategy = 'preventive';
      recommendedStrategy = 'preventive (increased frequency)';
      estimatedSavings = 10;
      nextMaintenanceDate = new Date(Date.now() + 14 * 86400000).toISOString();
      reasoning = 'Asset health is declining. Increase PM frequency and consider component replacement planning.';
    } else {
      currentStrategy = 'reactive';
      recommendedStrategy = 'corrective + replacement planning';
      estimatedSavings = 5;
      nextMaintenanceDate = new Date(Date.now() + 7 * 86400000).toISOString();
      reasoning = 'Asset health is poor. Immediate inspection required. Plan for component replacement or major overhaul.';
    }

    if (prediction && prediction.probability > 0.5) {
      reasoning += ` Failure risk is ${Math.round(prediction.probability * 100)}% within ${prediction.timeHorizon}.`;
      if (prediction.probability > 0.7) {
        nextMaintenanceDate = new Date(Date.now() + 7 * 86400000).toISOString();
      }
    }

    return {
      assetId,
      currentStrategy,
      recommendedStrategy,
      estimatedSavings,
      nextMaintenanceDate,
      confidence: 0.65,
      reasoning,
    };
  }

  /**
   * Batch health assessment for multiple assets
   */
  static async batchHealthAssessment(assetIds: string[]): Promise<HealthScore[]> {
    const results = await Promise.all(
      assetIds.map(id => this.calculateHealthScore(id).catch(() => ({
        assetId: id,
        score: 0,
        level: 'critical' as const,
        factors: [{ name: 'Error', weight: 1, score: 0, description: 'Assessment failed' }],
        updatedAt: new Date().toISOString(),
      })))
    );
    return results;
  }

  /**
   * Get predictive insights dashboard data
   */
  static async getInsightsDashboard(plantId?: string) {
    try {
      // Get top at-risk assets
      const assets = await db.asset.findMany({
        where: plantId ? { plantId } : undefined,
        select: { id: true, name: true, condition: true, criticality: true },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });

      const healthScores = await this.batchHealthAssessment(assets.map(a => a.id));
      const atRisk = healthScores.filter(h => h.score < 60);
      const avgHealth = healthScores.length > 0
        ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length)
        : 0;

      // Get recent anomaly counts
      let totalAnomalies = 0;
      try {
        const sources = await db.telemetryDataSource.findMany({
          where: plantId ? { plantId } : undefined,
          select: { id: true },
          take: 10,
        });
        for (const source of sources) {
          const anomalies = await this.detectAnomalies(source.id, 24);
          totalAnomalies += anomalies.length;
        }
      } catch { /* skip */ }

      return {
        totalAssets: assets.length,
        atRiskCount: atRisk.length,
        averageHealth: avgHealth,
        recentAnomalies: totalAnomalies,
        topRisks: atRisk.slice(0, 5).map(h => ({
          assetId: h.assetId,
          score: h.score,
          level: h.level,
          factors: h.factors.filter(f => f.score < 50).map(f => f.name),
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get insights dashboard', error);
      return {
        totalAssets: 0, atRiskCount: 0, averageHealth: 0,
        recentAnomalies: 0, topRisks: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
