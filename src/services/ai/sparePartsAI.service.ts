// ============================================================================
// AI SPARE PARTS INTELLIGENCE SERVICE
// ============================================================================
// Intelligent spare parts management:
// - Demand forecasting using consumption patterns
// - Critical spare identification
// - Obsolescence risk detection
// - Substitute part recommendation
// - Optimal stock level recommendation with confidence intervals
// - Supplier risk assessment
// - Cost optimization (when to buy, how much, from whom)
// - Parts standardization recommendations
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ai:sparePartsAI');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** Demand forecast for a single part */
export interface DemandForecast {
  partId: string;
  partName: string;
  partCode: string;
  currentStock: number;

  // Forecast
  forecastPeriod: string;     // e.g. "90 days"
  predictedDemand: number;
  confidence: number;         // 0-1
  confidenceInterval: { lower: number; upper: number };

  // Consumption pattern
  averageMonthlyConsumption: number;
  consumptionTrend: 'increasing' | 'stable' | 'decreasing';
  seasonalityFactor: number;  // 1.0 = no seasonality, >1 = seasonal peak expected

  // Recommendations
  reorderPoint: number;
  recommendedOrderQuantity: number;
  estimatedLeadTime: number;  // days
  stockoutRisk: number;       // 0-1 probability of stockout in forecast period
  reasoning: string;
}

/** Spare parts recommendation response */
export interface SparePartsRecommendation {
  recommendationId: string;
  generatedAt: string;
  summary: SparePartsSummary;
  criticalSpares: CriticalSpareItem[];
  obsolescenceRisks: ObsolescenceRisk[];
  substituteRecommendations: SubstituteRecommendation[];
  optimalStockLevels: OptimalStockLevel[];
  supplierAssessments: SupplierAssessment[];
  costOptimizations: CostOptimization[];
  standardizationRecommendations: StandardizationRecommendation[];
}

export interface SparePartsSummary {
  totalPartsAnalyzed: number;
  criticalCount: number;
  obsolescenceRiskCount: number;
  overstockCount: number;
  understockCount: number;
  potentialSavings: number;    // estimated annual savings from optimization
  totalInventoryValue: number;
}

export interface CriticalSpareItem {
  partId: string;
  partName: string;
  partCode: string;
  currentStock: number;
  criticalityScore: number;    // 0-100
  usedByAssets: string[];
  usedByFailureModes: string[];
  estimatedDowntimeCostPerDay: number;
  stockoutImpact: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export interface ObsolescenceRisk {
  partId: string;
  partName: string;
  partCode: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  lastUsedDate: string;
  lastUsedDaysAgo: number;
  recommendation: string;
}

export interface SubstituteRecommendation {
  originalPartId: string;
  originalPartName: string;
  originalPartCode: string;
  substitutePartId?: string;
  substitutePartName?: string;
  substitutePartCode?: string;
  compatibility: 'exact' | 'functional' | 'with_modification';
  costDifference: number;     // percentage (negative = cheaper)
  availability: 'in_stock' | 'available' | 'limited' | 'obsolete';
  reasoning: string;
}

export interface OptimalStockLevel {
  partId: string;
  partName: string;
  partCode: string;
  currentStock: number;
  optimalMin: number;         // safety stock
  optimalMax: number;         // max stock level
  reorderPoint: number;
  economicOrderQuantity: number;  // EOQ
  holdingCostPerYear: number;
  stockoutCostPerYear: number;
  confidence: number;
  reasoning: string;
}

export interface SupplierAssessment {
  supplierId: string;
  supplierName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  onTimeDeliveryRate: number;    // 0-1
  qualityRate: number;           // 0-1
  leadTimeDays: number;
  leadTimeVariability: number;   // days (std dev)
  priceCompetitiveness: number;  // 0-1
  overallScore: number;          // 0-100
  riskFactors: string[];
  recommendation: string;
}

export interface CostOptimization {
  partId: string;
  partName: string;
  partCode: string;
  currentStrategy: string;
  recommendedStrategy: string;
  estimatedAnnualSavings: number;
  savingsPercentage: number;
  recommendedOrderTiming: string;
  recommendedSupplier?: string;
  quantityAdjustment: number;    // positive = order more, negative = order less
  reasoning: string;
}

export interface StandardizationRecommendation {
  candidateGroupId: string;
  categoryName: string;
  currentVariants: number;
  recommendedPartId?: string;
  recommendedPartName?: string;
  consolidationRatio: number;   // how many variants can be consolidated
  estimatedSavings: number;
  affectedAssets: number;
  implementationEffort: 'low' | 'medium' | 'high';
  reasoning: string;
}

/** Input for demand forecast request */
export interface DemandForecastRequest {
  plantId?: string;
  category?: string;
  forecastDays?: number;
  includeConfidenceIntervals?: boolean;
}

/** Input for spare parts recommendations */
export interface SparePartsRecommendRequest {
  plantId?: string;
  category?: string;
  assessObsolescence?: boolean;
  suggestSubstitutes?: boolean;
  optimizeCosts?: boolean;
  standardize?: boolean;
}

// ============================================================================
// Main Service
// ============================================================================

export class SparePartsAIService {

  /**
   * Generate demand forecasts for spare parts.
   *
   * Algorithm:
   * 1. Fetch inventory items with consumption history
   * 2. Calculate average monthly consumption from stock movements
   * 3. Detect trend (increasing/stable/decreasing) via linear regression
   * 4. Detect seasonality via month-of-year aggregation
   * 5. Forecast using exponential smoothing (base + trend + seasonality)
   * 6. Calculate confidence intervals based on forecast error variance
   * 7. Derive reorder point and recommended order quantity
   *
   * The forecasting model is a simplified Holt-Winters exponential smoothing:
   *   Forecast(t) = (Level + Trend × t) × Seasonality(t)
   * Where Level, Trend, and Seasonality are estimated from historical data.
   */
  static async forecastDemand(request: DemandForecastRequest): Promise<DemandForecast[]> {
    const timer = logger.timer('spares.forecast');
    const forecastDays = request.forecastDays || 90;

    try {
      // Fetch inventory items with recent stock movements
      const items = await db.inventoryItem.findMany({
        where: {
          ...(request.plantId ? { plantId: request.plantId } : {}),
          ...(request.category ? { category: { contains: request.category, mode: 'insensitive' } } : {}),
          status: { not: 'inactive' },
        },
        select: {
          id: true,
          itemName: true,
          itemCode: true,
          currentStock: true,
          unit: true,
          reorderLevel: true,
          reorderQuantity: true,
          leadTime: true,
          unitCost: true,
          stockMovements: {
            where: { createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
            select: { quantity: true, movementType: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        take: 500,
      });

      const forecasts: DemandForecast[] = [];

      for (const item of items) {
        // Extract consumption from stock movements (issues = consumption)
        const issues = item.stockMovements.filter(m => m.movementType === 'issue');
        const receipts = item.stockMovements.filter(m => m.movementType === 'receipt');

        if (issues.length === 0) {
          // No consumption history — use reorder level if available
          forecasts.push({
            partId: item.id,
            partName: item.itemName,
            partCode: item.itemCode,
            currentStock: item.currentStock || 0,
            forecastPeriod: `${forecastDays} days`,
            predictedDemand: 0,
            confidence: 0.2,
            confidenceInterval: { lower: 0, upper: 0 },
            averageMonthlyConsumption: 0,
            consumptionTrend: 'stable',
            seasonalityFactor: 1.0,
            reorderPoint: item.reorderLevel || 0,
            recommendedOrderQuantity: item.reorderQuantity || 0,
            estimatedLeadTime: item.leadTime || 14,
            stockoutRisk: item.currentStock ? 0 : 0.5,
            reasoning: 'No consumption history available. Using configured reorder levels.',
          });
          continue;
        }

        // --- Monthly consumption aggregation ---
        const monthlyConsumption = aggregateMonthlyConsumption(issues);

        // --- Trend analysis (linear regression on monthly data) ---
        const { slope, intercept, rSquared } = linearRegression(monthlyConsumption);

        let trend: DemandForecast['consumptionTrend'] = 'stable';
        const avgMonthly = monthlyConsumption.length > 0
          ? monthlyConsumption.reduce((s, m) => s + m.consumption, 0) / monthlyConsumption.length
          : 0;

        if (slope > avgMonthly * 0.05 && rSquared > 0.3) trend = 'increasing';
        else if (slope < -avgMonthly * 0.05 && rSquared > 0.3) trend = 'decreasing';

        // --- Seasonality analysis ---
        const seasonality = calculateSeasonality(issues);

        // --- Forecast ---
        const currentMonth = new Date().getMonth();
        const forecastMonths = Math.ceil(forecastDays / 30);

        let predictedDemand = 0;
        for (let m = 1; m <= forecastMonths; m++) {
          const forecastMonth = (currentMonth + m) % 12;
          const baseDemand = Math.max(0, intercept + slope * (monthlyConsumption.length + m));
          const seasonalFactor = seasonality[forecastMonth] || 1.0;
          predictedDemand += baseDemand * seasonalFactor;
        }

        predictedDemand = Math.max(0, Math.round(predictedDemand));

        // --- Confidence interval ---
        // Based on residual variance from the regression
        const residuals = monthlyConsumption.map((m, i) =>
          m.consumption - (intercept + slope * i),
        );
        const residualStd = standardDeviation(residuals);
        const forecastStd = residualStd * Math.sqrt(forecastMonths); // forecast uncertainty grows with horizon
        const ciLower = Math.max(0, Math.round(predictedDemand - 1.96 * forecastStd));
        const ciUpper = Math.round(predictedDemand + 1.96 * forecastStd);

        const confidence = Math.max(0.3, Math.min(0.95, 0.4 + rSquared * 0.4 + Math.min(0.15, issues.length * 0.005)));

        // --- Reorder point calculation ---
        // ROP = (average daily demand × lead time) + safety stock
        const avgDailyDemand = avgMonthly / 30;
        const leadTimeDays = item.leadTime || 14;
        const safetyStock = Math.max(1, Math.round(residualStd * 1.65)); // 95th percentile
        const reorderPoint = Math.max(1, Math.round(avgDailyDemand * leadTimeDays + safetyStock));

        // --- Stockout risk ---
        // Probability that current stock < demand over lead time
        const leadTimeDemand = avgDailyDemand * leadTimeDays;
        const stockoutRisk = item.currentStock <= 0 ? 1.0
          : Math.max(0, Math.min(1, 1 - normalCDF(item.currentStock, leadTimeDemand, residualStd * Math.sqrt(leadTimeDays / 30) || 1)));

        // --- Recommended order quantity ---
        const recommendedOrderQty = Math.max(
          item.reorderQuantity || reorderPoint,
          Math.round(predictedDemand * 1.1 + safetyStock - (item.currentStock || 0)),
        );

        forecasts.push({
          partId: item.id,
          partName: item.itemName,
          partCode: item.itemCode,
          currentStock: item.currentStock || 0,
          forecastPeriod: `${forecastDays} days`,
          predictedDemand,
          confidence: Math.round(confidence * 100) / 100,
          confidenceInterval: { lower: ciLower, upper: ciUpper },
          averageMonthlyConsumption: Math.round(avgMonthly * 100) / 100,
          consumptionTrend: trend,
          seasonalityFactor: seasonality[currentMonth] || 1.0,
          reorderPoint,
          recommendedOrderQuantity: Math.max(0, recommendedOrderQty),
          estimatedLeadTime: leadTimeDays,
          stockoutRisk: Math.round(stockoutRisk * 100) / 100,
          reasoning: buildForecastReasoning(trend, seasonality[currentMonth], predictedDemand, confidence),
        });
      }

      timer.end();
      return forecasts;
    } catch (error) {
      logger.error('Demand forecast failed', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive spare parts recommendations.
   *
   * Algorithm:
   * 1. Fetch all inventory items with related data
   * 2. Critical spare identification: score based on usage frequency,
   *    asset criticality, lead time, and uniqueness (no substitutes)
   * 3. Obsolescence detection: parts not used in N months with low reorder activity
   * 4. Substitute suggestion: find parts with similar specs
   * 5. Optimal stock levels: EOQ model + safety stock calculation
   * 6. Supplier assessment: from supplier data + purchase order history
   * 7. Cost optimization: identify overstock/understock, bulk buy opportunities
   * 8. Standardization: group similar parts and suggest consolidation
   */
  static async getRecommendations(request: SparePartsRecommendRequest): Promise<SparePartsRecommendation> {
    const timer = logger.timer('spares.recommendations');

    try {
      // Fetch inventory
      const items = await db.inventoryItem.findMany({
        where: {
          ...(request.plantId ? { plantId: request.plantId } : {}),
          ...(request.category ? { category: { contains: request.category, mode: 'insensitive' } } : {}),
          status: { not: 'inactive' },
        },
        select: {
          id: true,
          itemName: true,
          itemCode: true,
          category: true,
          currentStock: true,
          minStock: true,
          reorderLevel: true,
          reorderQuantity: true,
          leadTime: true,
          unitCost: true,
          unit: true,
          description: true,
          stockMovements: {
            where: { createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
            select: { quantity: true, movementType: true, createdAt: true },
          },
          alternateParts: {
            select: { id: true, alternatePartId: true },
          },
          workOrderMaterials: {
            select: { workOrder: { select: { id: true; assetId: true; priority: true } } },
            take: 20,
          },
        },
        take: 500,
      });

      // Fetch suppliers
      const suppliers = await db.supplier.findMany({
        select: { id: true, name: true, leadTime: true, rating: true },
        take: 50,
      });

      // Fetch recent purchase orders for supplier assessment
      const recentPOs = await db.purchaseOrder.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 365 * 86400000) },
          status: { in: ['received', 'partial', 'completed'] },
        },
        select: { id: true, supplierId: true, createdAt: true, deliveryDate: true, expectedDate: true, totalAmount: true },
        take: 200,
      });

      // --- 1. Critical spares ---
      const criticalSpares = identifyCriticalSpares(items);

      // --- 2. Obsolescence risks ---
      const obsolescenceRisks = request.assessObsolescence !== false
        ? detectObsolescence(items)
        : [];

      // --- 3. Substitute recommendations ---
      const substitutes = request.suggestSubstitutes !== false
        ? suggestSubstitutes(items)
        : [];

      // --- 4. Optimal stock levels ---
      const optimalStockLevels = items.slice(0, 50).map(item => calculateOptimalStockLevel(item));

      // --- 5. Supplier assessments ---
      const supplierAssessments = assessSuppliers(suppliers, recentPOs);

      // --- 6. Cost optimizations ---
      const costOptimizations = request.optimizeCosts !== false
        ? optimizeCosts(items, optimalStockLevels)
        : [];

      // --- 7. Standardization recommendations ---
      const standardization = request.standardize !== false
        ? recommendStandardization(items)
        : [];

      // Summary
      const totalValue = items.reduce((s, i) => s + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
      const potentialSavings = costOptimizations.reduce((s, c) => s + c.estimatedAnnualSavings, 0);
      const understock = items.filter(i => (i.currentStock || 0) <= (i.reorderLevel || 0)).length;
      const overstock = items.filter(i => {
        if (!i.reorderQuantity || i.reorderQuantity === 0) return false;
        return (i.currentStock || 0) > i.reorderQuantity * 3;
      }).length;

      const summary: SparePartsSummary = {
        totalPartsAnalyzed: items.length,
        criticalCount: criticalSpares.length,
        obsolescenceRiskCount: obsolescenceRisks.length,
        overstockCount: overstock,
        understockCount: understock,
        potentialSavings: Math.round(potentialSavings * 100) / 100,
        totalInventoryValue: Math.round(totalValue * 100) / 100,
      };

      timer.end();

      return {
        recommendationId: `spr-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        summary,
        criticalSpares,
        obsolescenceRisks,
        substituteRecommendations: substitutes,
        optimalStockLevels,
        supplierAssessments,
        costOptimizations,
        standardizationRecommendations: standardization,
      };
    } catch (error) {
      logger.error('Spare parts recommendations failed', error);
      throw error;
    }
  }
}

// ============================================================================
// Helper Functions — Forecasting
// ============================================================================

/** Aggregate stock movements into monthly consumption totals */
function aggregateMonthlyConsumption(
  issues: Array<{ quantity: number; createdAt: Date }>,
): Array<{ month: number; consumption: number }> {
  const monthly = new Map<number, number>();

  for (const issue of issues) {
    const month = issue.createdAt.getFullYear() * 12 + issue.createdAt.getMonth();
    monthly.set(month, (monthly.get(month) || 0) + Math.abs(issue.quantity));
  }

  const sorted = [...monthly.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([m, consumption]) => ({ month: m, consumption }));
}

/** Simple linear regression: y = intercept + slope × x */
function linearRegression(data: Array<{ consumption: number }>): { slope: number; intercept: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.consumption || 0, rSquared: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((s, d) => s + d.consumption, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = data[i].consumption - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const rSquared = ssYY > 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;

  return { slope, intercept, rSquared };
}

/** Calculate seasonality factors by month (0-11).
 * Returns an array of 12 values where 1.0 = average, >1 = above average. */
function calculateSeasonality(
  issues: Array<{ quantity: number; createdAt: Date }>,
): number[] {
  const monthlyTotals = new Array(12).fill(0) as number[];
  const monthlyCounts = new Array(12).fill(0) as number[];

  for (const issue of issues) {
    const month = issue.createdAt.getMonth();
    monthlyTotals[month] += Math.abs(issue.quantity);
    monthlyCounts[month]++;
  }

  const overallAvg = monthlyTotals.reduce((s, t) => s + t, 0) / Math.max(1, monthlyCounts.reduce((s, c) => s + c, 0));

  return monthlyTotals.map((total, i) => {
    const monthAvg = monthlyCounts[i] > 0 ? total / monthlyCounts[i] : overallAvg;
    return overallAvg > 0 ? monthAvg / overallAvg : 1.0;
  });
}

/** Standard deviation of an array of numbers */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Approximate cumulative distribution function for normal distribution */
function normalCDF(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return x >= mean ? 1 : 0;
  const z = (x - mean) / stdDev;
  // Approximation using error function
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

function buildForecastReasoning(
  trend: string,
  seasonalityFactor: number,
  predictedDemand: number,
  confidence: number,
): string {
  const parts: string[] = [];

  parts.push(`Consumption trend is ${trend}.`);
  if (Math.abs(seasonalityFactor - 1.0) > 0.15) {
    parts.push(`Seasonal adjustment factor: ${seasonalityFactor.toFixed(2)}x.`);
  }
  parts.push(`Predicted demand: ${predictedDemand} units.`);
  parts.push(`Forecast confidence: ${Math.round(confidence * 100)}% (based on historical data quality and pattern stability).`);

  return parts.join(' ');
}

// ============================================================================
// Helper Functions — Critical Spares
// ============================================================================

/**
 * Identify critical spare parts.
 * Scoring criteria:
 * - Usage frequency (how often consumed)
 * - Asset criticality (used on critical assets?)
 * - Lead time (longer = more critical)
 * - Uniqueness (no substitutes = more critical)
 * - Financial impact (expensive parts on critical equipment)
 */
function identifyCriticalSpares(
  items: Array<{
    id: string; itemName: string; itemCode: string; currentStock: number | null;
    leadTime: number | null; unitCost: number | null; category: string | null;
    stockMovements: Array<{ quantity: number; movementType: string; createdAt: Date }>;
    workOrderMaterials: Array<{ workOrder: { assetId: string | null; priority: string | null } }>;
    alternateParts: Array<{ id: string }>;
  }>,
): CriticalSpareItem[] {
  return items.map(item => {
    const issues = item.stockMovements.filter(m => m.movementType === 'issue');
    const usageFrequency = issues.length;

    // Lead time factor (longer lead time = more critical)
    const leadTimeScore = Math.min(25, (item.leadTime || 14) / 30 * 25);

    // Usage frequency factor
    const usageScore = Math.min(25, usageFrequency * 5);

    // Uniqueness (no substitutes)
    const uniquenessScore = item.alternateParts.length === 0 ? 25 : 10;

    // Cost factor
    const costScore = Math.min(25, ((item.unitCost || 0) / 1000) * 25);

    const criticalityScore = Math.min(100, Math.round(leadTimeScore + usageScore + uniquenessScore + costScore));

    // Assets using this part
    const assetIds = [...new Set(item.workOrderMaterials.map(wm => wm.workOrder.assetId).filter(Boolean) as string[])];

    const stockoutImpact: CriticalSpareItem['stockoutImpact'] = criticalityScore >= 75 ? 'critical'
      : criticalityScore >= 50 ? 'high'
      : criticalityScore >= 25 ? 'medium' : 'low';

    return {
      partId: item.id,
      partName: item.itemName,
      partCode: item.itemCode,
      currentStock: item.currentStock || 0,
      criticalityScore,
      usedByAssets: assetIds.slice(0, 5),
      usedByFailureModes: [],   // Would be populated from WO failure mode data
      estimatedDowntimeCostPerDay: (item.unitCost || 0) * 0.5, // rough estimate
      stockoutImpact,
      reasoning: buildCriticalityReasoning(criticalityScore, usageFrequency, item.leadTime || 14, item.alternateParts.length),
    };
  }).filter(item => item.criticalityScore >= 40).sort((a, b) => b.criticalityScore - a.criticalityScore).slice(0, 20);
}

function buildCriticalityReasoning(
  score: number,
  usageFreq: number,
  leadTime: number,
  substituteCount: number,
): string {
  const parts: string[] = [`Overall criticality score: ${score}/100.`];

  if (usageFreq > 10) parts.push(`High usage frequency (${usageFreq} issues/year).`);
  if (leadTime > 21) parts.push(`Long lead time (${leadTime} days).`);
  if (substituteCount === 0) parts.push('No substitute parts available — sole source dependency.');
  if (score >= 75) parts.push('Classified as CRITICAL spare — maintain safety stock.');

  return parts.join(' ');
}

// ============================================================================
// Helper Functions — Obsolescence
// ============================================================================

function detectObsolescence(
  items: Array<{
    id: string; itemName: string; itemCode: string; currentStock: number | null;
    stockMovements: Array<{ quantity: number; movementType: string; createdAt: Date }>;
  }>,
): ObsolescenceRisk[] {
  const risks: ObsolescenceRisk[] = [];
  const oneYearAgo = Date.now() - 365 * 86400000;

  for (const item of items) {
    // Find last issue (consumption) date
    const issues = item.stockMovements.filter(m => m.movementType === 'issue');
    if (issues.length === 0) continue;

    const lastUsed = new Date(Math.max(...issues.map(i => i.createdAt.getTime())));
    const daysSinceUse = Math.floor((Date.now() - lastUsed.getTime()) / 86400000);

    let riskLevel: ObsolescenceRisk['riskLevel'] = 'low';
    const riskFactors: string[] = [];

    if (daysSinceUse > 365) {
      riskLevel = 'critical';
      riskFactors.push('No consumption in over 12 months');
    } else if (daysSinceUse > 270) {
      riskLevel = 'high';
      riskFactors.push('No consumption in over 9 months');
    } else if (daysSinceUse > 180) {
      riskLevel = 'medium';
      riskFactors.push('No consumption in over 6 months');
    }

    // Check if stock has been sitting (lots of stock, no movement)
    if ((item.currentStock || 0) > 0 && daysSinceUse > 180) {
      riskFactors.push(`${item.currentStock} units in stock with no recent usage`);
    }

    // Check if item was only used once or twice in the last year
    const recentIssues = issues.filter(i => i.createdAt.getTime() > oneYearAgo);
    if (recentIssues.length <= 1 && daysSinceUse > 180) {
      riskFactors.push('Very low consumption frequency (≤1 issue/year)');
    }

    if (riskFactors.length > 0) {
      if (riskLevel === 'low') riskLevel = 'medium';

      risks.push({
        partId: item.id,
        partName: item.itemName,
        partCode: item.itemCode,
        riskLevel,
        riskFactors,
        lastUsedDate: lastUsed.toISOString(),
        lastUsedDaysAgo: daysSinceUse,
        recommendation: daysSinceUse > 365
          ? 'Consider disposing excess stock. Verify if still needed in BOMs before reordering.'
          : daysSinceUse > 180
            ? 'Reduce reorder quantity. Monitor for next 3 months before disposition.'
            : 'Continue monitoring — flag for review if no consumption within 90 days.',
      });
    }
  }

  return risks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.riskLevel] || 4) - (order[b.riskLevel] || 4);
  }).slice(0, 20);
}

// ============================================================================
// Helper Functions — Substitutes
// ============================================================================

function suggestSubstitutes(
  items: Array<{
    id: string; itemName: string; itemCode: string; category: string | null;
    unitCost: number | null; currentStock: number | null; description: string | null;
  }>,
): SubstituteRecommendation[] {
  const recommendations: SubstituteRecommendation[] = [];

  // Group items by category
  const categoryGroups = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category || 'uncategorized';
    const existing = categoryGroups.get(cat) || [];
    existing.push(item);
    categoryGroups.set(cat, existing);
  }

  // For each category, find potential substitutes (items with similar names/codes)
  for (const [, groupItems] of categoryGroups) {
    if (groupItems.length < 2) continue;

    for (const item of groupItems) {
      // Find items with similar name patterns (simple word overlap)
      const words = new Set((item.itemName || '').toLowerCase().split(/[\s\-_/,()]+/).filter(w => w.length > 2));

      for (const candidate of groupItems) {
        if (candidate.id === item.id) continue;

        const candidateWords = new Set((candidate.itemName || '').toLowerCase().split(/[\s\-_/,()]+/).filter(w => w.length > 2));
        const overlap = [...words].filter(w => candidateWords.has(w)).length;

        if (overlap >= 2 && (item.unitCost || 0) > 0 && (candidate.unitCost || 0) > 0) {
          const costDiff = Math.round(((candidate.unitCost || 0) - (item.unitCost || 0)) / (item.unitCost || 1) * 100);

          if (costDiff < -10) { // Candidate is significantly cheaper
            recommendations.push({
              originalPartId: item.id,
              originalPartName: item.itemName,
              originalPartCode: item.itemCode,
              substitutePartId: candidate.id,
              substitutePartName: candidate.itemName,
              substitutePartCode: candidate.itemCode,
              compatibility: 'functional',
              costDifference: costDiff,
              availability: (candidate.currentStock || 0) > 0 ? 'in_stock' : 'available',
              reasoning: `Similar part in same category with ${Math.abs(costDiff)}% lower cost. Verify functional compatibility before substitution.`,
            });
          }
        }
      }
    }
  }

  return recommendations.slice(0, 20);
}

// ============================================================================
// Helper Functions — Optimal Stock Levels
// ============================================================================

function calculateOptimalStockLevel(
  item: {
    id: string; itemName: string; itemCode: string; currentStock: number | null;
    minStock: number | null; reorderLevel: number | null; reorderQuantity: number | null;
    leadTime: number | null; unitCost: number | null;
    stockMovements: Array<{ quantity: number; movementType: string; createdAt: Date }>;
  },
): OptimalStockLevel {
  const issues = item.stockMovements.filter(m => m.movementType === 'issue');
  const monthlyConsumption = aggregateMonthlyConsumption(issues);

  const n = monthlyConsumption.length;
  const avgMonthly = n > 0 ? monthlyConsumption.reduce((s, m) => s + m.consumption, 0) / n : 1;
  const avgDaily = avgMonthly / 30;
  const leadTimeDays = item.leadTime || 14;

  // Safety stock = Z × σ × √(lead time / review period)
  // Z = 1.65 for 95% service level
  const monthlyStdDev = n > 1 ? standardDeviation(monthlyConsumption.map(m => m.consumption)) : avgMonthly * 0.3;
  const safetyStock = Math.max(1, Math.round(1.65 * monthlyStdDev * Math.sqrt(leadTimeDays / 30)));

  // Reorder point
  const reorderPoint = Math.max(1, Math.round(avgDaily * leadTimeDays + safetyStock));

  // Economic Order Quantity (EOQ)
  // EOQ = √(2DS/H) where D = annual demand, S = order cost, H = holding cost per unit
  const annualDemand = avgMonthly * 12;
  const orderCost = 50; // estimated cost per order ($50)
  const holdingCostRate = 0.25; // 25% of unit value per year
  const unitCost = item.unitCost || 100;
  const holdingCostPerUnit = unitCost * holdingCostRate;
  const eoq = Math.max(1, Math.round(Math.sqrt((2 * annualDemand * orderCost) / Math.max(1, holdingCostPerUnit))));

  // Max stock = reorder point + EOQ
  const maxStock = Math.round(reorderPoint + eoq);

  const holdingCostPerYear = Math.round(maxStock / 2 * holdingCostPerUnit);
  const stockoutCostPerYear = Math.round((safetyStock / (reorderPoint + 1)) * unitCost * 10); // rough estimate

  return {
    partId: item.id,
    partName: item.itemName,
    partCode: item.itemCode,
    currentStock: item.currentStock || 0,
    optimalMin: safetyStock,
    optimalMax: maxStock,
    reorderPoint,
    economicOrderQuantity: eoq,
    holdingCostPerYear,
    stockoutCostPerYear,
    confidence: Math.min(0.9, 0.4 + n * 0.05),
    reasoning: `EOQ: ${eoq} units. Safety stock: ${safetyStock} units (95% service level). ROP: ${reorderPoint} units.`,
  };
}

// ============================================================================
// Helper Functions — Supplier Assessment
// ============================================================================

function assessSuppliers(
  suppliers: Array<{ id: string; name: string; leadTime: number | null; rating: number | null }>,
  purchaseOrders: Array<{ supplierId: string; createdAt: Date; deliveryDate: Date | null; expectedDate: Date | null; totalAmount: number | null }>,
): SupplierAssessment[] {
  return suppliers.map(supplier => {
    const supplierPOs = purchaseOrders.filter(po => po.supplierId === supplier.id);

    // On-time delivery rate
    let onTimeCount = 0;
    let totalDelivered = 0;
    for (const po of supplierPOs) {
      if (po.deliveryDate && po.expectedDate) {
        totalDelivered++;
        if (po.deliveryDate <= new Date(po.expectedDate.getTime() + 3 * 86400000)) {
          onTimeCount++; // 3-day grace period
        }
      }
    }
    const onTimeRate = totalDelivered > 0 ? onTimeCount / totalDelivered : 0.8; // default 80%

    // Lead time and variability
    const leadTimes: number[] = [];
    for (const po of supplierPOs) {
      if (po.deliveryDate) {
        leadTimes.push(Math.round((po.deliveryDate.getTime() - po.createdAt.getTime()) / 86400000));
      }
    }
    const avgLeadTime = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((s, l) => s + l, 0) / leadTimes.length)
      : supplier.leadTime || 14;
    const leadTimeVar = leadTimes.length > 1 ? Math.round(standardDeviation(leadTimes)) : Math.round(avgLeadTime * 0.2);

    // Quality rate (using supplier rating as proxy)
    const qualityRate = (supplier.rating || 3.5) / 5;

    // Price competitiveness (based on total spend — lower is better)
    const totalSpend = supplierPOs.reduce((s, po) => s + (po.totalAmount || 0), 0);
    const avgOrderValue = supplierPOs.length > 0 ? totalSpend / supplierPOs.length : 0;
    const priceCompetitiveness = 0.7 + Math.min(0.3, 1000 / Math.max(100, avgOrderValue)); // rough heuristic

    // Overall score
    const overallScore = Math.round(
      onTimeRate * 30 +
      qualityRate * 30 +
      (1 - Math.min(1, leadTimeVar / 30)) * 20 +
      priceCompetitiveness * 20,
    );

    let riskLevel: SupplierAssessment['riskLevel'] = 'low';
    const riskFactors: string[] = [];

    if (onTimeRate < 0.7) { riskLevel = 'high'; riskFactors.push(`Low on-time delivery rate (${Math.round(onTimeRate * 100)}%)`); }
    else if (onTimeRate < 0.85) { riskLevel = 'medium'; riskFactors.push('Below-average delivery reliability'); }

    if (avgLeadTime > 30) { riskLevel = riskLevel === 'low' ? 'medium' : riskLevel; riskFactors.push(`Long average lead time (${avgLeadTime} days)`); }
    if (leadTimeVar > 10) { riskFactors.push(`High lead time variability (±${leadTimeVar} days)`); }
    if (supplierPOs.length < 3) { riskFactors.push('Limited order history'); riskLevel = riskLevel === 'low' ? 'medium' : riskLevel; }

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      riskLevel,
      onTimeDeliveryRate: Math.round(onTimeRate * 100) / 100,
      qualityRate: Math.round(qualityRate * 100) / 100,
      leadTimeDays: avgLeadTime,
      leadTimeVariability: leadTimeVar,
      priceCompetitiveness: Math.round(priceCompetitiveness * 100) / 100,
      overallScore,
      riskFactors,
      recommendation: overallScore >= 75
        ? 'Reliable supplier — continue partnership and consider for strategic items.'
        : overallScore >= 50
          ? 'Acceptable supplier — monitor lead time and delivery performance.'
          : 'At-risk supplier — consider qualification of alternative suppliers.',
    };
  }).sort((a, b) => b.overallScore - a.overallScore).slice(0, 20);
}

// ============================================================================
// Helper Functions — Cost Optimization
// ============================================================================

function optimizeCosts(
  items: Array<{
    id: string; itemName: string; itemCode: string;
    currentStock: number | null; unitCost: number | null; reorderQuantity: number | null;
    stockMovements: Array<{ quantity: number; movementType: string; createdAt: Date }>;
  }>,
  optimalLevels: OptimalStockLevel[],
): CostOptimization[] {
  const optimizations: CostOptimization[] = [];

  for (const item of items) {
    const optimal = optimalLevels.find(o => o.partId === item.id);
    if (!optimal) continue;

    const currentStock = item.currentStock || 0;
    const unitCost = item.unitCost || 0;

    // Overstock: current stock >> optimal max
    if (currentStock > optimal.optimalMax * 1.5 && unitCost > 0) {
      const excessValue = (currentStock - optimal.optimalMax) * unitCost;
      const holdingCostSaving = excessValue * 0.25; // 25% annual holding cost

      optimizations.push({
        partId: item.id,
        partName: item.itemName,
        partCode: item.itemCode,
        currentStrategy: `Current stock: ${currentStock} units (exceeds optimal max ${optimal.optimalMax})`,
        recommendedStrategy: `Reduce stock to ${optimal.optimalMax} units. Defer next order until stock reaches ROP of ${optimal.reorderPoint}.`,
        estimatedAnnualSavings: Math.round(holdingCostSaving),
        savingsPercentage: Math.round((excessValue / Math.max(1, currentStock * unitCost)) * 100),
        recommendedOrderTiming: `Order when stock reaches ${optimal.reorderPoint}`,
        quantityAdjustment: -(currentStock - optimal.optimalMax),
        reasoning: `Excess inventory of ${currentStock - optimal.optimalMax} units ties up $${Math.round(excessValue)} in working capital with ${Math.round(holdingCostSaving)} annual holding cost.`,
      });
    }

    // Understock: current stock < safety stock
    if (currentStock < optimal.optimalMin && unitCost > 0) {
      const stockoutRisk = (optimal.optimalMin - currentStock) / optimal.optimalMin;
      const estimatedStockoutCost = stockoutRisk * unitCost * 5; // rough: 5× unit cost per stockout event

      optimizations.push({
        partId: item.id,
        partName: item.itemName,
        partCode: item.itemCode,
        currentStrategy: `Current stock: ${currentStock} units (below safety stock ${optimal.optimalMin})`,
        recommendedStrategy: `Order ${optimal.economicOrderQuantity} units immediately to restore safety stock.`,
        estimatedAnnualSavings: Math.round(estimatedStockoutCost),
        savingsPercentage: 0,
        recommendedOrderTiming: 'Immediately',
        quantityAdjustment: optimal.economicOrderQuantity,
        reasoning: `Stock below safety stock. Risk of stockout with estimated cost of $${Math.round(estimatedStockoutCost)}.`,
      });
    }
  }

  return optimizations.sort((a, b) => b.estimatedAnnualSavings - a.estimatedAnnualSavings).slice(0, 20);
}

// ============================================================================
// Helper Functions — Standardization
// ============================================================================

function recommendStandardization(
  items: Array<{
    id: string; itemName: string; itemCode: string; category: string | null;
    description: string | null; unitCost: number | null;
    workOrderMaterials: Array<{ workOrder: { assetId: string | null } }>;
  }>,
): StandardizationRecommendation[] {
  const recommendations: StandardizationRecommendation[] = [];

  // Group items by category
  const categoryGroups = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category || 'uncategorized';
    const existing = categoryGroups.get(cat) || [];
    existing.push(item);
    categoryGroups.set(cat, existing);
  }

  // Find categories with many variants
  for (const [category, groupItems] of categoryGroups) {
    if (groupItems.length < 3) continue;

    // Check for name similarity within category
    const nameBases = new Map<string, typeof groupItems>();
    for (const item of groupItems) {
      // Extract base name (first 2-3 significant words)
      const baseName = (item.itemName || '')
        .split(/[\s\-_/,()]+/)
        .filter(w => w.length > 3 && !['the', 'and', 'for', 'with', 'type', 'model'].includes(w.toLowerCase()))
        .slice(0, 2)
        .join(' ')
        .toLowerCase();

      if (!baseName) continue;
      const existing = nameBases.get(baseName) || [];
      existing.push(item);
      nameBases.set(baseName, existing);
    }

    for (const [baseName, variantItems] of nameBases) {
      if (variantItems.length < 3) continue;

      // Suggest consolidating to the most common/cheapest variant
      const cheapest = variantItems
        .filter(v => (v.unitCost || 0) > 0)
        .sort((a, b) => (a.unitCost || 0) - (b.unitCost || 0))[0];

      const totalCost = variantItems.reduce((s, v) => s + (v.unitCost || 0), 0);
      const avgCost = totalCost / variantItems.length;
      const potentialSaving = cheapest ? (avgCost - (cheapest.unitCost || 0)) * variantItems.length * 0.5 : 0;

      // Count affected assets
      const affectedAssets = new Set(
        variantItems.flatMap(v => v.workOrderMaterials.map(wm => wm.workOrder.assetId).filter(Boolean) as string[]),
      ).size;

      recommendations.push({
        candidateGroupId: `std-${baseName.replace(/\s+/g, '-')}-${Date.now()}`,
        categoryName: category,
        currentVariants: variantItems.length,
        recommendedPartId: cheapest?.id,
        recommendedPartName: cheapest?.itemName,
        consolidationRatio: Math.round(cheapest ? variantItems.length / 1 : 0), // N:1 consolidation
        estimatedSavings: Math.round(potentialSaving),
        affectedAssets,
        implementationEffort: variantItems.length > 5 ? 'high' : 'medium',
        reasoning: `${variantItems.length} similar items in "${category}" category can potentially be standardized to reduce variety. Using ${cheapest?.itemName || 'most common variant'} could save an estimated $${Math.round(potentialSaving)} annually.`,
      });
    }
  }

  return recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings).slice(0, 10);
}
