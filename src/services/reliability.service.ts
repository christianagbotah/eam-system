// ============================================================================
// RELIABILITY SERVICE — Weibull analysis, risk matrix, MTBF/MTTR
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const log = createLogger('ReliabilityService');

export const reliabilityService = {
  // ── Weibull Analysis ──────────────────────────────────────────────────────
  // Shape-scale parameter estimation using median rank regression

  async weibullAnalysis(
    id: string,
    mode: 'asset' | 'component'
  ) {
    const timer = log.timer('weibullAnalysis');
    const where: Record<string, unknown> = mode === 'component' ? { componentId: id } : { assetId: id };

    const failures = await db.failureRecord.findMany({
      where,
      orderBy: { detectedAt: 'asc' },
      select: { detectedAt: true, resolvedAt: true, downtimeMinutes: true },
    });

    if (failures.length < 3) {
      return {
        eta: null,
        beta: null,
        characteristicLife: null,
        b10Life: null,
        b50Life: null,
        meanLife: null,
        reliabilityAtInterval: null,
        failureCount: failures.length,
        message:
          'Insufficient failure data for Weibull analysis (minimum 3 failures required)',
      };
    }

    // Calculate time between failures (hours)
    const tbf: number[] = [];
    for (let i = 1; i < failures.length; i++) {
      const diff =
        new Date(failures[i].detectedAt).getTime() -
        new Date(failures[i - 1].detectedAt).getTime();
      if (diff > 0) tbf.push(diff / (1000 * 60 * 60));
    }

    if (tbf.length < 2) {
      return {
        eta: null,
        beta: null,
        characteristicLife: null,
        b10Life: null,
        b50Life: null,
        meanLife: null,
        reliabilityAtInterval: null,
        failureCount: failures.length,
        message: 'Insufficient time-between-failure data',
      };
    }

    // ── Median Rank Regression (Benard's approximation) ─────────────────────
    const sortedTbf = [...tbf].sort((a, b) => a - b);
    const n = sortedTbf.length;

    // Median ranks
    const ranks = sortedTbf.map((_, i) => (i + 1 - 0.3) / (n + 0.4));

    // Log transforms for linear regression
    const logT = sortedTbf.map((t) => Math.log(t));
    const logLogRanks = ranks.map((r) =>
      Math.log(Math.log(1 / (1 - Math.min(r, 0.999))))
    );

    // Linear regression: ln(ln(1/(1-F))) = beta * ln(t) - beta * ln(eta)
    const nPts = logT.length;
    const sumX = logT.reduce((s, x) => s + x, 0);
    const sumY = logLogRanks.reduce((s, y) => s + y, 0);
    const sumXY = logT.reduce((s, x, i) => s + x * logLogRanks[i], 0);
    const sumX2 = logT.reduce((s, x) => s + x * x, 0);

    const beta =
      (nPts * sumXY - sumX * sumY) / (nPts * sumX2 - sumX * sumX);

    // Clamp shape parameter to reasonable engineering range
    const shape = Math.max(0.5, Math.min(5, beta));

    // Scale (eta) — characteristic life
    const lnEta = (sumX * sumY - nPts * sumXY) / (nPts * sumX2 - sumX * sumX);
    const scale = Math.exp(Math.abs(lnEta));

    // B10 life (time at which 10% have failed): t = eta * (-ln(0.9))^(1/beta)
    const b10Life = scale * Math.pow(-Math.log(0.9), 1 / shape);
    const b50Life = scale * Math.pow(-Math.log(0.5), 1 / shape);

    // Mean life approximation using gamma function
    const meanLife = scale * gammaApprox(1 + 1 / shape);

    // Reliability at various time intervals
    const reliabilityAtInterval = [100, 500, 1000, 2000, 5000, 10000].map(
      (hours) => ({
        hours,
        reliability:
          Math.round(
            Math.exp(-Math.pow(hours / scale, shape)) * 10000
          ) / 100,
      })
    );

    timer.end();
    log.info('Weibull analysis complete', {
      shape: shape.toFixed(3),
      scale: scale.toFixed(1),
      failures: failures.length,
    });

    return {
      shape, // beta parameter (<1 infant mortality, =1 constant, >1 wear-out)
      characteristicLife: scale,
      b10Life,
      b50Life,
      meanLife,
      reliabilityAtInterval,
      failureCount: failures.length,
      dataPoints: tbf.length,
      interpretation:
        shape < 1
          ? 'Infant Mortality Pattern'
          : shape < 1.5
            ? 'Random Failures'
            : shape < 2.5
              ? 'Moderate Wear-out'
              : 'Significant Wear-out',
    };
  },

  // ── Asset Risk Matrix ─────────────────────────────────────────────────────

  async assetRiskMatrix(plantId?: string) {
    const timer = log.timer('assetRiskMatrix');
    const where: Record<string, unknown> = {};
    if (plantId) where.plantId = plantId;

    const assets = await db.asset.findMany({
      where: { ...where, isActive: true },
      include: {
        digitalTwin: { select: { healthScore: true } },
        _count: {
          select: { failureRecords: true, iotDevices: true, maintenanceRequests: true },
        },
      },
    });

    // Fetch open work orders for all assets in a single query
    const assetIds = assets.map((a) => a.id);
    const openWorkOrders = assetIds.length > 0
      ? await db.workOrder.groupBy({
          by: ['assetId'],
          where: {
            assetId: { in: assetIds },
            status: { in: ['in_progress', 'assigned', 'on_hold'] },
          },
          _count: { id: true },
        })
      : [];

    // Map assetId → count of open WOs
    const woCountMap = new Map<string, number>();
    for (const row of openWorkOrders) {
      if (row.assetId) woCountMap.set(row.assetId, row._count.id);
    }

    // Also get total work order counts
    const totalWorkOrders = assetIds.length > 0
      ? await db.workOrder.groupBy({
          by: ['assetId'],
          where: { assetId: { in: assetIds } },
          _count: { id: true },
        })
      : [];
    const totalWoMap = new Map<string, number>();
    for (const row of totalWorkOrders) {
      if (row.assetId) totalWoMap.set(row.assetId, row._count.id);
    }

    const criticalityWeights: Record<string, number> = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 90,
    };

    const riskMatrix = assets.map((asset) => {
      const healthScore = asset.digitalTwin?.healthScore ?? 50;
      const criticality = asset.criticality || 'medium';
      const openWOs = woCountMap.get(asset.id) || 0;

      // Weighted risk score
      const healthRisk = (100 - healthScore) * 0.4;
      const criticalityRisk = criticalityWeights[criticality] || 30;
      const activityRisk = Math.min(30, openWOs * 10);
      const riskScore = Math.round(
        healthRisk + criticalityRisk * 0.4 + activityRisk
      );

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetTag: asset.assetTag,
        criticality,
        healthScore,
        openWorkOrders: openWOs,
        riskScore: Math.min(100, riskScore),
        riskLevel:
          riskScore >= 80
            ? 'critical'
            : riskScore >= 60
              ? 'high'
              : riskScore >= 40
                ? 'medium'
                : 'low',
        totalWorkOrders: totalWoMap.get(asset.id) || 0,
        totalFailures: asset._count.failureRecords,
        iotDevices: asset._count.iotDevices,
      };
    });

    riskMatrix.sort((a, b) => b.riskScore - a.riskScore);

    timer.end();
    return {
      assets: riskMatrix,
      summary: {
        total: riskMatrix.length,
        critical: riskMatrix.filter((r) => r.riskLevel === 'critical').length,
        high: riskMatrix.filter((r) => r.riskLevel === 'high').length,
        medium: riskMatrix.filter((r) => r.riskLevel === 'medium').length,
        low: riskMatrix.filter((r) => r.riskLevel === 'low').length,
        avgRiskScore:
          riskMatrix.length > 0
            ? Math.round(
                riskMatrix.reduce((s, r) => s + r.riskScore, 0) /
                  riskMatrix.length
              )
            : 0,
      },
    };
  },

  // ── MTBF / MTTR Computation ───────────────────────────────────────────────

  async computeReliabilityMetrics(assetId?: string, componentId?: string) {
    const timer = log.timer('computeReliabilityMetrics');
    const where: Record<string, unknown> = {};
    if (assetId) where.assetId = assetId;
    if (componentId) where.componentId = componentId;

    const failures = await db.failureRecord.findMany({
      where,
      orderBy: { detectedAt: 'asc' },
      select: { detectedAt: true, resolvedAt: true, downtimeMinutes: true },
    });

    const resolved = failures.filter((f) => f.resolvedAt);

    // MTBF (Mean Time Between Failures) in hours
    let mtbf: number | null = null;
    if (failures.length >= 2) {
      const totalTimeMs =
        new Date(failures[failures.length - 1].detectedAt).getTime() -
        new Date(failures[0].detectedAt).getTime();
      mtbf = totalTimeMs / (1000 * 60 * 60) / (failures.length - 1);
    }

    // MTTR (Mean Time To Repair) in hours
    let mttr: number | null = null;
    if (resolved.length > 0) {
      const totalRepairMs = resolved.reduce(
        (sum, f) =>
          sum + (new Date(f.resolvedAt!).getTime() - new Date(f.detectedAt).getTime()),
        0
      );
      mttr = totalRepairMs / (1000 * 60 * 60) / resolved.length;
    }

    // Total downtime
    const totalDowntimeMinutes = failures.reduce(
      (sum, f) => sum + f.downtimeMinutes,
      0
    );

    timer.end();
    return {
      totalFailures: failures.length,
      resolvedFailures: resolved.length,
      mtbf: mtbf ? Math.round(mtbf * 10) / 10 : null,
      mttr: mttr ? Math.round(mttr * 10) / 10 : null,
      totalDowntimeHours: Math.round((totalDowntimeMinutes / 60) * 10) / 10,
      availability:
        mtbf && mttr
          ? Math.round((mtbf / (mtbf + mttr)) * 10000) / 100
          : null,
    };
  },
};

// ── Gamma function approximation (Lanczos) ──────────────────────────────────

function gammaApprox(z: number): number {
  // Stirling's approximation for positive real numbers
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaApprox(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
