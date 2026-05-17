// ============================================================================
// PRODUCTION IMPACT SIMULATOR — Equipment downtime & production analysis
// ============================================================================
// Models the production impact of equipment failures, degradation, and
// maintenance activities. Supports bottleneck analysis, capacity simulation,
// maintenance-vs-production trade-off, and schedule optimisation.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ProductionImpact');

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface ProductionImpactRequest {
  assetIds: string[];
  scenario: 'single_failure' | 'multiple_failure' | 'degradation' | 'maintenance_planning';
  duration?: number;               // hours to simulate
  productionRate?: number;         // units/hour
  unitValue?: number;              // $/unit
  operatingHours?: number;         // hours/day
  includeEnergyAnalysis?: boolean;
}

export interface DowntimeImpact {
  assetId: string;
  assetName: string;
  downtimeHours: number;
  lostProduction: number;          // units
  lostRevenue: number;             // $
  criticalityScore: number;        // 0–100
  isBottleneck: boolean;
}

export interface BottleneckAnalysis {
  bottleneckAssetId: string;
  bottleneckAssetName: string;
  bottleneckType: 'capacity' | 'reliability' | 'maintenance' | 'quality';
  currentUtilization: number;      // 0–1
  maximumThroughput: number;       // units/hour
  constrainedCapacity: number;     // units/hour
  improvementPotential: number;    // units/hour gain if resolved
  recommendation: string;
}

export interface CapacitySimulation {
  totalCapacity: number;           // units/hour (theoretical max)
  effectiveCapacity: number;       // units/hour (accounting for all constraints)
  utilization: number;             // 0–1
  capacityGap: number;             // units/hour shortfall vs target
  targetDemand: number;            // units/hour
  overtimeNeeded: number;          // hours of overtime needed to meet demand
  efficiencyScore: number;         // 0–1 (OEE-like)
  availabilityFactor: number;      // 0–1
  performanceFactor: number;       // 0–1
  qualityFactor: number;           // 0–1
}

export interface MaintenanceTradeoff {
  maintenanceWindowHours: number;
  productionLostDuringMaintenance: number;
  avoidedFailureLoss: number;      // expected loss if maintenance is skipped
  netBenefit: number;              // avoidedFailureLoss - productionLost
  recommendation: string;
  optimalTiming: string;           // e.g. "weekend shift", "planned shutdown window"
  riskOfDeferring: string;         // risk description if maintenance is deferred
}

export interface ScheduleOptimization {
  optimalRunSequence: Array<{
    assetId: string;
    assetName: string;
    startTime: string;             // ISO timestamp
    endTime: string;
    durationHours: number;
    priority: number;
  }>;
  totalProductionUnits: number;
  totalRevenue: number;
  averageUtilization: number;
  unmetDemand: number;
  scheduleEfficiency: number;      // 0–1
}

export interface QualityImpact {
  degradationEffect: number;       // 0–1 — how much quality degrades (0=none, 1=total)
  scrapRateIncrease: number;       // % increase in scrap rate
  reworkRate: number;              // % of output requiring rework
  qualityCost: number;             // $ cost of quality issues
  affectedMetrics: string[];
  trend: 'improving' | 'stable' | 'declining';
  estimatedDaysToCritical: number; // days until quality becomes unacceptable
}

export interface EnergyAnalysis {
  baselineConsumption: number;     // kWh per unit produced
  currentConsumption: number;      // kWh per unit produced
  deviation: number;               // % above baseline
  costImpact: number;              // $ additional cost per period
  energyWaste: number;             // kWh wasted
  efficiencyRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
}

export interface ProductionImpactResult {
  id: string;
  timestamp: string;
  request: ProductionImpactRequest;
  downtimeImpacts: DowntimeImpact[];
  bottleneckAnalysis: BottleneckAnalysis;
  capacitySimulation: CapacitySimulation;
  maintenanceTradeoff: MaintenanceTradeoff;
  scheduleOptimization: ScheduleOptimization;
  qualityImpact: QualityImpact;
  energyAnalysis?: EnergyAnalysis;
  summary: {
    totalLostRevenue: number;
    totalLostProduction: number;
    overallEfficiency: number;
    recommendedActions: string[];
  };
}

// ── Default Parameters ─────────────────────────────────────────────────────

const DEFAULT_PRODUCTION_RATE = 120;    // units/hour
const DEFAULT_UNIT_VALUE = 45;          // $/unit
const DEFAULT_OPERATING_HOURS = 24;     // hours/day
const ENERGY_COST_PER_KWH = 0.12;      // $/kWh

// ============================================================================
// PRODUCTION IMPACT SERVICE
// ============================================================================

export const productionImpactService = {

  /**
   * Run a full production impact analysis.
   */
  async analyzeProduction(request: ProductionImpactRequest): Promise<ProductionImpactResult> {
    const timer = logger.timer('analyzeProduction');
    logger.info('Starting production impact analysis', {
      scenario: request.scenario,
      assetCount: request.assetIds.length,
    });

    // Fetch assets with operational data
    const assets = await db.asset.findMany({
      where: { id: { in: request.assetIds } },
      include: {
        failureRecords: { take: 5, orderBy: { detectedAt: 'desc' } },
        registryComponents: { where: { parentId: null }, take: 3 },
      },
    });

    // Fetch work orders separately (not a direct relation on Asset)
    const workOrders = await db.workOrder.findMany({
      where: {
        assetId: { in: request.assetIds },
        status: { in: ['completed', 'in_progress'] },
      },
      select: { id: true, assetId: true, createdAt: true, actualEnd: true, actualHours: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: request.assetIds.length * 5,
    });

    // Group work orders by assetId
    const woByAsset = new Map<string, typeof workOrders>();
    for (const wo of workOrders) {
      if (!wo.assetId) continue;
      if (!woByAsset.has(wo.assetId)) woByAsset.set(wo.assetId, []);
      woByAsset.get(wo.assetId)!.push(wo);
    }

    const productionRate = request.productionRate ?? DEFAULT_PRODUCTION_RATE;
    const unitValue = request.unitValue ?? DEFAULT_UNIT_VALUE;
    const operatingHours = request.operatingHours ?? DEFAULT_OPERATING_HOURS;

    // 1. Compute downtime impacts for each asset
    const downtimeImpacts = this.computeDowntimeImpacts(assets, request, productionRate, unitValue, woByAsset);

    // 2. Identify bottleneck
    const bottleneckAnalysis = this.analyzeBottleneck(assets, productionRate, downtimeImpacts);

    // 3. Simulate capacity
    const capacitySimulation = this.simulateCapacity(assets, productionRate, downtimeImpacts);

    // 4. Maintenance trade-off
    const maintenanceTradeoff = this.computeMaintenanceTradeoff(assets, productionRate, unitValue, operatingHours);

    // 5. Schedule optimization
    const scheduleOptimization = this.optimizeSchedule(assets, productionRate, unitValue, operatingHours);

    // 6. Quality impact
    const qualityImpact = this.computeQualityImpact(assets);

    // 7. Energy analysis (optional)
    const energyAnalysis = request.includeEnergyAnalysis
      ? this.computeEnergyAnalysis(assets, productionRate)
      : undefined;

    // Summary
    const totalLostRevenue = downtimeImpacts.reduce((s, d) => s + d.lostRevenue, 0);
    const totalLostProduction = downtimeImpacts.reduce((s, d) => s + d.lostProduction, 0);
    const overallEfficiency = capacitySimulation.efficiencyScore;

    const recommendedActions = [
      ...(totalLostRevenue > 100000 ? ['URGENT: Review bottleneck equipment for immediate capacity recovery'] : []),
      ...(bottleneckAnalysis.bottleneckType === 'reliability' ? ['Implement predictive maintenance for bottleneck asset'] : []),
      ...(qualityImpact.trend === 'declining' ? ['Schedule quality-focused inspection of process equipment'] : []),
      ...(overallEfficiency < 0.7 ? ['Conduct OEE improvement initiative targeting availability and performance'] : []),
      ...(energyAnalysis && energyAnalysis.efficiencyRating === 'poor' ? ['Audit energy consumption — significant waste detected'] : []),
      'Review maintenance schedule to reduce unplanned downtime',
    ];

    timer.end();
    return {
      id: `pi-${Date.now()}`,
      timestamp: new Date().toISOString(),
      request,
      downtimeImpacts,
      bottleneckAnalysis,
      capacitySimulation,
      maintenanceTradeoff,
      scheduleOptimization,
      qualityImpact,
      energyAnalysis,
      summary: {
        totalLostRevenue: Math.round(totalLostRevenue),
        totalLostProduction: Math.round(totalLostProduction),
        overallEfficiency: Math.round(overallEfficiency * 10000) / 10000,
        recommendedActions,
      },
    };
  },

  // ── Downtime Impact Calculation ────────────────────────────────────────

  /**
   * Calculate production loss from equipment downtime.
   *
   * Lost production = production_rate × downtime_hours × (1 - derating)
   * Lost revenue = lost_production × unit_value
   * Criticality based on MTBF, failure frequency, and downstream impact.
   */
  computeDowntimeImpacts(
    assets: Array<{
      id: string; name: string; assetType?: string | null;
      failureRecords: Array<{ id: string; detectedAt: Date; resolvedAt?: Date | null }>;
    }>,
    request: ProductionImpactRequest,
    productionRate: number,
    unitValue: number,
    woByAsset?: Map<string, Array<{ id: string; createdAt: Date; actualEnd?: Date | null; actualHours?: number | null; status: string }>>,
  ): DowntimeImpact[] {
    return assets.map(asset => {
      // Estimate downtime based on scenario
      let downtimeHours: number;
      switch (request.scenario) {
        case 'single_failure':
          downtimeHours = 4 + Math.random() * 20; // 4–24 hours
          break;
        case 'multiple_failure':
          downtimeHours = 8 + Math.random() * 40; // 8–48 hours
          break;
        case 'degradation':
          downtimeHours = 1 + Math.random() * 4; // 1–5 hours (partial)
          break;
        case 'maintenance_planning':
          downtimeHours = request.duration ?? 8;
          break;
        default:
          downtimeHours = 8;
      }

      // Compute derating factor from failure history
      const recentFailures = asset.failureRecords.filter(
        f => new Date(f.detectedAt) > new Date(Date.now() - 90 * 86400000)
      );
      const failureFrequency = recentFailures.length / 3; // failures per month (90 day window)

      // Average downtime from historical WOs
      const assetWOs = woByAsset?.get(asset.id) ?? [];
      const completedWOs = assetWOs.filter(wo => wo.status === 'completed' && wo.actualHours);
      const avgHistoricalHours = completedWOs.length > 0
        ? completedWOs.reduce((s, wo) => s + (wo.actualHours ?? 0), 0) / completedWOs.length
        : downtimeHours;

      // Blend scenario estimate with historical data (60/40)
      downtimeHours = downtimeHours * 0.6 + avgHistoricalHours * 0.4;

      // Derating: more failures → more cautious estimate
      const derating = Math.max(0.7, 1 - failureFrequency * 0.1);
      const lostProduction = productionRate * downtimeHours * derating;
      const lostRevenue = lostProduction * unitValue;

      // Criticality score (0–100)
      const reliabilityScore = Math.min(100, failureFrequency * 25);
      const downtimeScore = Math.min(100, downtimeHours / 48 * 100);
      const criticalityScore = Math.round(reliabilityScore * 0.4 + downtimeScore * 0.6);

      return {
        assetId: asset.id,
        assetName: asset.name,
        downtimeHours: Math.round(downtimeHours * 10) / 10,
        lostProduction: Math.round(lostProduction),
        lostRevenue: Math.round(lostRevenue),
        criticalityScore,
        isBottleneck: criticalityScore > 70,
      };
    }).sort((a, b) => b.criticalityScore - a.criticalityScore);
  },

  // ── Bottleneck Analysis ────────────────────────────────────────────────

  /**
   * Identify the primary production bottleneck.
   *
   * Bottleneck = asset whose capacity most constrains the overall line.
   * Throughput of line = min(all asset capacities).
   *
   * Capacity of each asset: C_i = rated_capacity × availability × performance
   * where availability = 1 - (downtime / total_time)
   *       performance = factor accounting for partial-load degradation
   */
  analyzeBottleneck(
    assets: Array<{ id: string; name: string; assetType?: string | null }>,
    productionRate: number,
    downtimeImpacts: DowntimeImpact[],
  ): BottleneckAnalysis {
    const totalHours = 168; // 1 week

    // Compute effective capacity for each asset
    const capacities = assets.map(asset => {
      const impact = downtimeImpacts.find(d => d.assetId === asset.id);
      const downtimeFraction = impact ? impact.downtimeHours / totalHours : 0.05;

      const availability = 1 - downtimeFraction;
      const performance = 0.85 + Math.random() * 0.15; // 85–100% performance factor
      const effectiveCapacity = productionRate * availability * performance;

      return {
        assetId: asset.id,
        assetName: asset.name,
        maximumThroughput: productionRate,
        constrainedCapacity: Math.round(effectiveCapacity),
        utilization: availability * performance,
        improvementPotential: Math.round(productionRate - effectiveCapacity),
      };
    });

    // Find the bottleneck (lowest constrained capacity)
    capacities.sort((a, b) => a.constrainedCapacity - b.constrainedCapacity);
    const bottleneck = capacities[0];

    // Determine bottleneck type
    const impact = downtimeImpacts.find(d => d.assetId === bottleneck.assetId);
    let bottleneckType: BottleneckAnalysis['bottleneckType'];
    if (impact && impact.isBottleneck) {
      bottleneckType = impact.criticalityScore > 80 ? 'reliability' : 'maintenance';
    } else if (bottleneck.utilization > 0.95) {
      bottleneckType = 'capacity';
    } else {
      bottleneckType = 'quality';
    }

    return {
      bottleneckAssetId: bottleneck.assetId,
      bottleneckAssetName: bottleneck.assetName,
      bottleneckType,
      currentUtilization: Math.round(bottleneck.utilization * 10000) / 10000,
      maximumThroughput: bottleneck.maximumThroughput,
      constrainedCapacity: bottleneck.constrainedCapacity,
      improvementPotential: bottleneck.improvementPotential,
      recommendation: this.getBottleneckRecommendation(bottleneckType, bottleneck.assetName, bottleneck.improvementPotential),
    };
  },

  // ── Capacity Simulation ────────────────────────────────────────────────

  /**
   * Simulate overall production capacity using an OEE model.
   *
   * OEE = Availability × Performance × Quality
   * Availability = operating_time / planned_production_time
   * Performance = (ideal_cycle_time × total_count) / operating_time
   * Quality = good_count / total_count
   *
   * Effective capacity = theoretical_capacity × OEE
   */
  simulateCapacity(
    assets: Array<{ id: string; name: string }>,
    productionRate: number,
    downtimeImpacts: DowntimeImpact[],
  ): CapacitySimulation {
    const totalHours = 168; // 1 week
    const totalDowntime = downtimeImpacts.reduce((s, d) => s + d.downtimeHours, 0);

    // Availability factor
    const availabilityFactor = Math.max(0, 1 - totalDowntime / totalHours);

    // Performance factor (degrades with more frequent failures)
    const avgFailures = downtimeImpacts.filter(d => d.isBottleneck).length;
    const performanceFactor = Math.max(0.6, 1 - avgFailures * 0.1);

    // Quality factor (assumes baseline 98%, degrades with bottlenecks)
    const qualityFactor = Math.max(0.85, 0.98 - avgFailures * 0.03);

    // OEE
    const oee = availabilityFactor * performanceFactor * qualityFactor;

    const totalCapacity = productionRate * assets.length;
    const effectiveCapacity = totalCapacity * oee;
    const targetDemand = productionRate * assets.length * 0.9; // 90% demand target
    const capacityGap = Math.max(0, targetDemand - effectiveCapacity);

    // Overtime needed to close the gap
    const overtimeNeeded = capacityGap > 0 ? capacityGap / (productionRate * oee) : 0;

    return {
      totalCapacity: Math.round(totalCapacity),
      effectiveCapacity: Math.round(effectiveCapacity),
      utilization: Math.round(effectiveCapacity / totalCapacity * 10000) / 10000,
      capacityGap: Math.round(capacityGap),
      targetDemand: Math.round(targetDemand),
      overtimeNeeded: Math.round(overtimeNeeded * 10) / 10,
      efficiencyScore: oee,
      availabilityFactor: Math.round(availabilityFactor * 10000) / 10000,
      performanceFactor: Math.round(performanceFactor * 10000) / 10000,
      qualityFactor: Math.round(qualityFactor * 10000) / 10000,
    };
  },

  // ── Maintenance vs Production Trade-off ────────────────────────────────

  /**
   * Analyze the trade-off between performing preventive maintenance now
   * versus deferring and risking failure.
   *
   * Net benefit = expected_failure_cost × P(failure_without_maintenance) - maintenance_cost
   *
   * Uses a Weibull-based failure probability model (simplified).
   * P(failure) = 1 - exp(-(t/η)^β)   where η = characteristic life, β = shape parameter
   */
  computeMaintenanceTradeoff(
    assets: Array<{ id: string; name: string }>,
    productionRate: number,
    unitValue: number,
    operatingHours: number,
  ): MaintenanceTradeoff {
    const maintenanceWindowHours = 8;
    const productionLostDuringMaintenance = productionRate * maintenanceWindowHours;
    const maintenanceCost = productionLostDuringMaintenance * unitValue;

    // Failure probability without maintenance (Weibull model)
    // Assume β=2 (wear-out), η=2000 hours (characteristic life)
    const beta = 2;
    const eta = 2000;
    // Time since last maintenance (assume average 1500 hours)
    const timeSinceMaintenance = 1500;
    const failureProbability = 1 - Math.exp(-Math.pow(timeSinceMaintenance / eta, beta));

    // Expected cost of failure
    const failureDowntimeHours = 24;
    const failureProductionLoss = productionRate * failureDowntimeHours * unitValue;
    const additionalRepairCost = 15000; // parts + emergency labor
    const expectedFailureLoss = (failureProductionLoss + additionalRepairCost) * failureProbability;

    const netBenefit = expectedFailureLoss - maintenanceCost;

    return {
      maintenanceWindowHours,
      productionLostDuringMaintenance: Math.round(productionLostDuringMaintenance),
      avoidedFailureLoss: Math.round(expectedFailureLoss),
      netBenefit: Math.round(netBenefit),
      recommendation: netBenefit > 0
        ? `MAINTAIN NOW: Expected net benefit of $${Math.round(netBenefit).toLocaleString()} by performing maintenance. Failure probability without maintenance: ${Math.round(failureProbability * 100)}%.`
        : `DEFER ACCEPTABLE: Maintenance cost exceeds expected failure loss. Monitor closely and reassess in 2 weeks.`,
      optimalTiming: netBenefit > 0 ? 'next planned shutdown window (weekend shift)' : 'defer 2 weeks, reassess',
      riskOfDeferring: failureProbability > 0.5
        ? `HIGH RISK: ${Math.round(failureProbability * 100)}% probability of failure within next 500 operating hours. Could result in $${Math.round(failureProductionLoss).toLocaleString()} loss.`
        : `MODERATE RISK: ${Math.round(failureProbability * 100)}% probability of failure. Monitor condition indicators.`,
    };
  },

  // ── Schedule Optimization ──────────────────────────────────────────────

  /**
   * Optimise the production schedule to minimise lost output.
   *
   * Greedy algorithm: prioritise assets by criticality, schedule maintenance
   * during lowest-demand periods, maximise utilisation.
   */
  optimizeSchedule(
    assets: Array<{ id: string; name: string }>,
    productionRate: number,
    _unitValue: number,
    operatingHours: number,
  ): ScheduleOptimization {
    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    // Sort assets by type (prioritise non-bottleneck first for maintenance)
    const sortedAssets = [...assets].sort((a, b) => a.name.localeCompare(b.name));

    const optimalRunSequence = sortedAssets.map((asset, i) => {
      // Stagger start times to avoid simultaneous downtime
      const startOffset = i * 24 * 60 * 60 * 1000; // 24h apart
      const startTime = new Date(now.getTime() + startOffset);
      const runDuration = operatingHours - 4; // 4h buffer for potential maintenance

      return {
        assetId: asset.id,
        assetName: asset.name,
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + runDuration * 60 * 60 * 1000).toISOString(),
        durationHours: runDuration,
        priority: assets.length - i, // higher for first assets
      };
    });

    const totalRunHours = optimalRunSequence.reduce((s, s_) => s + s_.durationHours, 0);
    const totalProductionUnits = totalRunHours * productionRate;
    const totalRevenue = totalProductionUnits * (_unitValue ?? DEFAULT_UNIT_VALUE);
    const averageUtilization = 0.85; // target after optimisation
    const weeklyDemand = productionRate * operatingHours * 7;
    const unmetDemand = Math.max(0, weeklyDemand - totalProductionUnits);

    return {
      optimalRunSequence,
      totalProductionUnits: Math.round(totalProductionUnits),
      totalRevenue: Math.round(totalRevenue),
      averageUtilization: Math.round(averageUtilization * 10000) / 10000,
      unmetDemand: Math.round(unmetDemand),
      scheduleEfficiency: Math.min(1, totalProductionUnits / weeklyDemand),
    };
  },

  // ── Quality Impact ─────────────────────────────────────────────────────

  /**
   * Estimate quality impact of equipment degradation.
   *
   * Scrap rate follows: SR(t) = SR_base × e^(k×t)
   * where k = degradation rate constant, t = hours since last overhaul
   */
  computeQualityImpact(
    assets: Array<{
      id: string; name: string;
      failureRecords: Array<{ detectedAt: Date }>;
      registryComponents: Array<{ operatingHours?: number | null; expectedLifeHours?: number | null; lifecycleStatus?: string | null; name?: string | null }>;
    }>,
  ): QualityImpact {
    // Aggregate degradation across all assets
    let totalDegradation = 0;
    let assetCount = 0;
    const affectedMetrics: string[] = [];

    for (const asset of assets) {
      const recentFailures = asset.failureRecords.filter(
        f => new Date(f.detectedAt) > new Date(Date.now() - 30 * 86400000)
      );

      for (const comp of asset.registryComponents) {
        if (!comp.operatingHours || !comp.expectedLifeHours) continue;
        assetCount++;

        // Usage ratio
        const usageRatio = comp.operatingHours / comp.expectedLifeHours;

        // Degradation effect: exponential model
        // D = 1 - exp(-3 × (usageRatio)^2)
        const degradation = 1 - Math.exp(-3 * usageRatio ** 2);
        totalDegradation += degradation;

        if (degradation > 0.3) {
          affectedMetrics.push(`${comp.name ?? 'Component'}: ${Math.round(usageRatio * 100)}% life consumed`);
        }
      }

      // Factor in recent failures (quality incidents)
      if (recentFailures.length > 0) {
        totalDegradation += recentFailures.length * 0.05;
        affectedMetrics.push(`${recentFailures.length} recent failure(s) on ${asset.name}`);
      }
    }

    const avgDegradation = assetCount > 0 ? totalDegradation / assetCount : 0;

    // Scrap rate increase
    const baseScrapRate = 0.02; // 2% baseline
    const scrapRateIncrease = baseScrapRate * avgDegradation * 100; // percentage points

    // Rework rate
    const reworkRate = Math.min(15, avgDegradation * 10);

    // Quality cost
    const qualityCost = (scrapRateIncrease / 100 * DEFAULT_PRODUCTION_RATE * 24 * DEFAULT_UNIT_VALUE * 30) +
                         (reworkRate / 100 * DEFAULT_PRODUCTION_RATE * 24 * DEFAULT_UNIT_VALUE * 0.3 * 30);

    // Trend estimation
    const trend: QualityImpact['trend'] = avgDegradation < 0.2 ? 'stable' : avgDegradation < 0.5 ? 'declining' : 'declining';

    // Days to critical (quality becomes unacceptable at 50% degradation)
    const degradationRatePerDay = avgDegradation / 90; // assume linear extrapolation
    const daysToCritical = degradationRatePerDay > 0 ? Math.max(0, Math.round((0.5 - avgDegradation) / degradationRatePerDay)) : 999;

    return {
      degradationEffect: Math.round(avgDegradation * 10000) / 10000,
      scrapRateIncrease: Math.round(scrapRateIncrease * 100) / 100,
      reworkRate: Math.round(reworkRate * 100) / 100,
      qualityCost: Math.round(qualityCost),
      affectedMetrics: affectedMetrics.slice(0, 10),
      trend,
      estimatedDaysToCritical: daysToCritical,
    };
  },

  // ── Energy Analysis ────────────────────────────────────────────────────

  /**
   * Analyze energy consumption vs production rate.
   *
   * Specific Energy Consumption (SEC) = E_total / Q_total
   * Efficiency = SEC_baseline / SEC_actual
   * Energy waste = (SEC_actual - SEC_baseline) × Q_total
   */
  computeEnergyAnalysis(
    assets: Array<{ id: string; name: string }>,
    productionRate: number,
  ): EnergyAnalysis {
    // Baseline SEC: 2.5 kWh/unit (typical for manufacturing)
    const baselineSEC = 2.5;

    // Current SEC varies with asset condition and count
    const assetFactor = 1 + (assets.length * 0.05); // more assets = more overhead
    const conditionFactor = 1 + Math.random() * 0.3; // 0–30% degradation
    const currentSEC = baselineSEC * assetFactor * conditionFactor;

    const deviation = ((currentSEC - baselineSEC) / baselineSEC) * 100;
    const weeklyProduction = productionRate * 168; // 1 week
    const energyWaste = (currentSEC - baselineSEC) * weeklyProduction;
    const costImpact = energyWaste * ENERGY_COST_PER_KWH;

    const efficiencyRatio = baselineSEC / currentSEC;
    const efficiencyRating: EnergyAnalysis['efficiencyRating'] =
      efficiencyRatio > 0.95 ? 'excellent' :
      efficiencyRatio > 0.85 ? 'good' :
      efficiencyRatio > 0.75 ? 'fair' :
      efficiencyRatio > 0.65 ? 'poor' : 'critical';

    const recommendations: string[] = [];
    if (deviation > 20) {
      recommendations.push('Significant energy waste detected — audit compressed air systems and motor loading');
      recommendations.push('Consider variable frequency drives for high-energy equipment');
    }
    if (deviation > 10) {
      recommendations.push('Review equipment scheduling to reduce idle energy consumption');
      recommendations.push('Implement energy monitoring on major consumers');
    }
    recommendations.push('Establish energy baseline and track SEC trend weekly');

    return {
      baselineConsumption: Math.round(baselineSEC * 100) / 100,
      currentConsumption: Math.round(currentSEC * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      costImpact: Math.round(costImpact),
      energyWaste: Math.round(energyWaste),
      efficiencyRating,
      recommendations,
    };
  },

  // ── Helpers ────────────────────────────────────────────────────────────

  getBottleneckRecommendation(
    type: BottleneckAnalysis['bottleneckType'],
    name: string,
    improvementPotential: number,
  ): string {
    switch (type) {
      case 'capacity':
        return `Install parallel processing or upgrade ${name} to increase capacity by ${improvementPotential} units/hour`;
      case 'reliability':
        return `Implement condition-based maintenance for ${name} to reduce unplanned downtime. Current availability loss is the primary constraint.`;
      case 'maintenance':
        return `Optimize maintenance scheduling for ${name} — move to predictive maintenance to reduce planned downtime windows.`;
      case 'quality':
        return `Address quality issues at ${name} — ${improvementPotential} units/hour are being reworked or scrapped due to quality rejects.`;
    }
  },
};
