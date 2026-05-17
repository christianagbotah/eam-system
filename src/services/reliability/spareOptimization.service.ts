// ============================================================================
// SPARE PARTS OPTIMIZATION SERVICE
// EOQ, Reorder Points, ABC-XYZ Classification, Criticality-based Stocking
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';

const log = createLogger('SpareOptimizationService');

// ── TYPES ────────────────────────────────────────────────────────────────────

export interface AnalyzeSparePartRequest {
  inventoryItemId: string;
  annualDemand?: number;
  unitCost?: number;
  holdingCostPercent?: number;
  orderingCost?: number;
  leadTimeDays?: number;
  serviceLevel?: number;
  currentStock?: number;
  analysisPeriod?: string;
}

export interface OptimizeResult {
  inventoryItemId: string;
  abcClassification: string;
  xyzClassification: string;
  annualDemand: number;
  unitCost: number;
  eoq: number;
  reorderPoint: number;
  safetyStock: number;
  recommendedStock: number;
  stockOutRisk: number;
  annualHoldingCost: number;
  annualOrderingCost: number;
  totalAnnualCost: number;
  savingsPotential: number;
  criticality: string;
  serviceLevel: number;
  numberOfOrdersPerYear: number;
}

export interface BulkOptimizeRequest {
  inventoryItemIds: string[];
  serviceLevel?: number;
  holdingCostPercent?: number;
}

export interface SparePartSummary {
  totalItems: number;
  byAbc: Record<string, number>;
  byXyz: Record<string, number>;
  totalOptimizedCost: number;
  totalSavingsPotential: number;
  criticalStockoutRisks: Array<{ itemId: string; itemName: string; stockOutRisk: number }>;
}

export interface ListOptimizationParams {
  abcClassification?: string;
  xyzClassification?: string;
  criticality?: string;
  page?: number;
  limit?: number;
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const VALID_ABC = ['A', 'B', 'C'];
const VALID_XYZ = ['X', 'Y', 'Z'];
const VALID_CRITICALITY = ['low', 'medium', 'high', 'critical'];

// ── HELPERS ──────────────────────────────────────────────────────────────────

/** Inverse normal distribution (approximation for service level → z-score) */
function normalInvCDF(p: number): number {
  // Abramowitz and Stegun approximation
  if (p <= 0) return -3.09;
  if (p >= 1) return 3.09;
  if (p === 0.5) return 0;

  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

/** ABC classification based on cumulative annual consumption value */
function classifyABC(annualValue: number, totalValues: number[], itemIndex: number): string {
  const sorted = [...totalValues].sort((a, b) => b - a);
  const cumulativePct = sorted.slice(0, itemIndex + 1).reduce((s, v) => s + v, 0) / sorted.reduce((s, v) => s + v, 0);
  if (cumulativePct <= 0.80) return 'A';
  if (cumulativePct <= 0.95) return 'B';
  return 'C';
}

/** XYZ classification based on demand variability (coefficient of variation) */
function classifyXYZ(monthlyDemands: number[]): string {
  if (monthlyDemands.length < 3) return 'Z';

  const mean = monthlyDemands.reduce((s, v) => s + v, 0) / monthlyDemands.length;
  if (mean === 0) return 'Z';

  const variance = monthlyDemands.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / monthlyDemands.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  if (cv < 0.5) return 'X'; // Consistent demand
  if (cv < 1.0) return 'Y'; // Variable demand
  return 'Z';               // Highly variable demand
}

/** Determine criticality based on ABC-XYZ matrix and asset criticality */
function determineCriticality(
  abc: string,
  xyz: string,
  assetCriticality?: string,
): string {
  // Base criticality from ABC-XYZ
  if (abc === 'A' && xyz === 'Z') return 'high';     // High value, unpredictable
  if (abc === 'A') return 'high';                      // High value items
  if (abc === 'B' && xyz === 'X') return 'medium';     // Moderate value, predictable
  if (abc === 'B') return 'medium';
  if (abc === 'C' && xyz === 'Z') return 'low';        // Low value, unpredictable
  if (abc === 'C') return 'low';

  // Escalate if linked to critical asset
  if (assetCriticality === 'critical') return 'critical';
  if (assetCriticality === 'high') return 'high';

  return 'medium';
}

/** Get consumption history for an inventory item */
async function getConsumptionHistory(inventoryItemId: string): Promise<number[]> {
  const movements = await db.stockMovement.findMany({
    where: {
      itemId: inventoryItemId,
      type: 'out',
    },
    select: { quantity: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 365, // Last year
  });

  // Group by month
  const monthly: Record<string, number> = {};
  for (const m of movements) {
    const key = `${m.createdAt.getFullYear()}-${String(m.createdAt.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] ?? 0) + m.quantity;
  }

  return Object.values(monthly).length > 0
    ? Object.values(monthly)
    : [];
}

// ── SERVICE ──────────────────────────────────────────────────────────────────

export const spareOptimizationService = {

  /**
   * List spare optimizations
   */
  async listOptimizations(params: ListOptimizationParams) {
    const timer = log.timer('listOptimizations');
    const { abcClassification, xyzClassification, criticality, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (abcClassification) where.abcClassification = abcClassification;
    if (xyzClassification) where.xyzClassification = xyzClassification;
    if (criticality) where.criticality = criticality;

    const [items, total] = await Promise.all([
      db.spareOptimization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.spareOptimization.count({ where }),
    ]);

    timer.end();
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * Analyze a single spare part — EOQ, reorder point, safety stock, classification
   */
  async analyzeSparePart(data: AnalyzeSparePartRequest): Promise<OptimizeResult> {
    const timer = log.timer('analyzeSparePart');

    // Verify inventory item exists
    const item = await db.inventoryItem.findUnique({
      where: { id: data.inventoryItemId },
      select: {
        id: true, name: true, itemCode: true, category: true,
        currentStock: true, minStockLevel: true, reorderQuantity: true,
        unitCost: true,
      },
    });
    if (!item) throw new NotFoundError('InventoryItem', data.inventoryItemId);

    // Get consumption history
    const consumption = await getConsumptionHistory(data.inventoryItemId);
    const monthlyDemands = consumption.length > 0
      ? consumption
      : new Array(12).fill(0);

    // Parameters
    const annualDemand = data.annualDemand ?? monthlyDemands.reduce((s, v) => s + v, 0);
    const unitCost = data.unitCost ?? item.unitCost ?? 0;
    const holdingCostPercent = (data.holdingCostPercent ?? 25) / 100;
    const orderingCost = data.orderingCost ?? 50; // Default $50 per order
    const leadTimeDays = data.leadTimeDays ?? 30;
    const serviceLevel = data.serviceLevel ?? 0.95;
    const currentStock = data.currentStock ?? item.currentStock ?? 0;

    // ── EOQ Calculation ──
    const eoq = annualDemand > 0 && orderingCost > 0
      ? Math.sqrt((2 * annualDemand * orderingCost) / (unitCost * holdingCostPercent))
      : 0;

    // ── ABC Classification ──
    const annualValue = annualDemand * unitCost;
    const abcClassification = annualValue > unitCost * 50
      ? 'A'
      : annualValue > unitCost * 10
        ? 'B'
        : 'C';

    // ── XYZ Classification ──
    const xyzClassification = classifyXYZ(monthlyDemands);

    // ── Criticality ──
    const criticality = determineCriticality(abcClassification, xyzClassification);

    // ── Safety Stock ──
    const meanDemand = monthlyDemands.reduce((s, v) => s + v, 0) / monthlyDemands.length;
    const demandStdDev = Math.sqrt(
      monthlyDemands.reduce((s, v) => s + Math.pow(v - meanDemand, 2), 0) / monthlyDemands.length
    );
    const leadTimeDemand = meanDemand * (leadTimeDays / 30);
    const zScore = normalInvCDF(serviceLevel);
    const safetyStock = zScore * demandStdDev * Math.sqrt(leadTimeDays / 30);

    // ── Reorder Point ──
    const reorderPoint = leadTimeDemand + safetyStock;

    // ── Recommended Stock ──
    const recommendedStock = Math.max(eoq, reorderPoint + safetyStock);

    // ── Stock-out Risk ──
    const stockOutRisk = currentStock > 0
      ? Math.max(0, Math.min(1, 1 - normalInvCDF(Math.min(0.999, (currentStock - leadTimeDemand) / Math.max(demandStdDev, 0.01)))))
      : 1;

    // ── Cost Calculations ──
    const avgInventory = recommendedStock / 2;
    const annualHoldingCost = avgInventory * unitCost * holdingCostPercent;
    const numberOfOrdersPerYear = annualDemand > 0 && eoq > 0
      ? Math.ceil(annualDemand / eoq)
      : 0;
    const annualOrderingCost = numberOfOrdersPerYear * orderingCost;
    const totalAnnualCost = annualHoldingCost + annualOrderingCost;

    // ── Savings Potential ──
    const currentReorderQty = item.reorderQuantity ?? 0;
    const currentTotalCost = currentReorderQty > 0
      ? (currentReorderQty / 2) * unitCost * holdingCostPercent + (annualDemand / currentReorderQty) * orderingCost
      : totalAnnualCost * 1.2; // Assume 20% waste if no reorder quantity set
    const savingsPotential = Math.max(0, currentTotalCost - totalAnnualCost);

    const result: OptimizeResult = {
      inventoryItemId: data.inventoryItemId,
      abcClassification,
      xyzClassification,
      annualDemand: Math.round(annualDemand * 100) / 100,
      unitCost,
      eoq: Math.round(eoq * 100) / 100,
      reorderPoint: Math.round(reorderPoint * 100) / 100,
      safetyStock: Math.round(safetyStock * 100) / 100,
      recommendedStock: Math.round(recommendedStock * 100) / 100,
      stockOutRisk: Math.round(stockOutRisk * 1000) / 1000,
      annualHoldingCost: Math.round(annualHoldingCost * 100) / 100,
      annualOrderingCost: Math.round(annualOrderingCost * 100) / 100,
      totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
      savingsPotential: Math.round(savingsPotential * 100) / 100,
      criticality,
      serviceLevel,
      numberOfOrdersPerYear,
    };

    // Save or update optimization
    const existing = await db.spareOptimization.findFirst({
      where: { inventoryItemId: data.inventoryItemId },
    });

    if (existing) {
      await db.spareOptimization.update({
        where: { id: existing.id },
        data: {
          abcClassification,
          xyzClassification,
          annualDemand: result.annualDemand,
          unitCost,
          holdingCostPercent: holdingCostPercent * 100,
          orderingCost,
          leadTimeDays,
          serviceLevel,
          eoq: result.eoq,
          reorderPoint: result.reorderPoint,
          safetyStock: result.safetyStock,
          stockOutRisk: result.stockOutRisk,
          criticality,
          recommendedStock: result.recommendedStock,
          currentStock,
          annualHoldingCost: result.annualHoldingCost,
          annualOrderingCost: result.annualOrderingCost,
          totalAnnualCost: result.totalAnnualCost,
          savingsPotential: result.savingsPotential,
          analysisPeriod: data.analysisPeriod,
          analyzedById: data.inventoryItemId,
        },
      });
    } else {
      await db.spareOptimization.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          abcClassification,
          xyzClassification,
          annualDemand: result.annualDemand,
          unitCost,
          holdingCostPercent: holdingCostPercent * 100,
          orderingCost,
          leadTimeDays,
          serviceLevel,
          eoq: result.eoq,
          reorderPoint: result.reorderPoint,
          safetyStock: result.safetyStock,
          stockOutRisk: result.stockOutRisk,
          criticality,
          recommendedStock: result.recommendedStock,
          currentStock,
          annualHoldingCost: result.annualHoldingCost,
          annualOrderingCost: result.annualOrderingCost,
          totalAnnualCost: result.totalAnnualCost,
          savingsPotential: result.savingsPotential,
          analysisPeriod: data.analysisPeriod,
          analyzedById: data.inventoryItemId,
        },
      });
    }

    timer.end();
    log.info('Spare part analyzed', {
      itemId: data.inventoryItemId,
      abc: abcClassification,
      xyz: xyzClassification,
      criticality,
      totalAnnualCost: result.totalAnnualCost,
      savings: result.savingsPotential,
    });

    return result;
  },

  /**
   * Bulk optimize multiple spare parts
   */
  async bulkOptimize(data: BulkOptimizeRequest): Promise<{
    results: OptimizeResult[];
    summary: SparePartSummary;
  }> {
    const timer = log.timer('bulkOptimize');

    const results: OptimizeResult[] = [];
    const criticalRisks: Array<{ itemId: string; itemName: string; stockOutRisk: number }> = [];

    for (const itemId of data.inventoryItemIds) {
      try {
        const item = await db.inventoryItem.findUnique({
          where: { id: itemId },
          select: { name: true, unitCost: true },
        });

        const result = await this.analyzeSparePart({
          inventoryItemId: itemId,
          serviceLevel: data.serviceLevel,
          holdingCostPercent: data.holdingCostPercent,
        });

        results.push(result);

        if (result.stockOutRisk > 0.1 && item) {
          criticalRisks.push({
            itemId,
            itemName: item.name,
            stockOutRisk: result.stockOutRisk,
          });
        }
      } catch (error) {
        log.warn(`Failed to analyze item ${itemId}`, { error: (error as Error).message });
      }
    }

    const summary: SparePartSummary = {
      totalItems: results.length,
      byAbc: {
        A: results.filter((r) => r.abcClassification === 'A').length,
        B: results.filter((r) => r.abcClassification === 'B').length,
        C: results.filter((r) => r.abcClassification === 'C').length,
      },
      byXyz: {
        X: results.filter((r) => r.xyzClassification === 'X').length,
        Y: results.filter((r) => r.xyzClassification === 'Y').length,
        Z: results.filter((r) => r.xyzClassification === 'Z').length,
      },
      totalOptimizedCost: Math.round(results.reduce((s, r) => s + r.totalAnnualCost, 0) * 100) / 100,
      totalSavingsPotential: Math.round(results.reduce((s, r) => s + r.savingsPotential, 0) * 100) / 100,
      criticalStockoutRisks: criticalRisks.sort((a, b) => b.stockOutRisk - a.stockOutRisk),
    };

    timer.end();
    return { results, summary };
  },

  /**
   * Get spare parts summary for dashboards
   */
  async getSummary(): Promise<SparePartSummary> {
    const optimizations = await db.spareOptimization.findMany();

    const byAbc: Record<string, number> = { A: 0, B: 0, C: 0 };
    const byXyz: Record<string, number> = { X: 0, Y: 0, Z: 0 };

    for (const opt of optimizations) {
      if (opt.abcClassification && VALID_ABC.includes(opt.abcClassification)) {
        byAbc[opt.abcClassification]++;
      }
      if (opt.xyzClassification && VALID_XYZ.includes(opt.xyzClassification)) {
        byXyz[opt.xyzClassification]++;
      }
    }

    const criticalRisks: Array<{ itemId: string; itemName: string; stockOutRisk: number }> = [];
    for (const opt of optimizations) {
      if ((opt.stockOutRisk ?? 0) > 0.1) {
        const invItem = await db.inventoryItem.findUnique({
          where: { id: opt.inventoryItemId },
          select: { name: true },
        });
        criticalRisks.push({
          itemId: opt.inventoryItemId,
          itemName: invItem?.name ?? 'Unknown',
          stockOutRisk: opt.stockOutRisk ?? 0,
        });
      }
    }

    return {
      totalItems: optimizations.length,
      byAbc,
      byXyz,
      totalOptimizedCost: Math.round(optimizations.reduce((s, o) => s + (o.totalAnnualCost ?? 0), 0) * 100) / 100,
      totalSavingsPotential: Math.round(optimizations.reduce((s, o) => s + (o.savingsPotential ?? 0), 0) * 100) / 100,
      criticalStockoutRisks: criticalRisks.sort((a, b) => b.stockOutRisk - a.stockOutRisk).slice(0, 20),
    };
  },

  /**
   * Get classification reference data
   */
  getAbcDescription() {
    return {
      A: { description: 'High value — 80% of total consumption value', policy: 'Tight control, frequent review, accurate records' },
      B: { description: 'Medium value — 15% of total consumption value', policy: 'Moderate control, periodic review' },
      C: { description: 'Low value — 5% of total consumption value', policy: 'Simple controls, bulk ordering, infrequent review' },
    };
  },

  getXyzDescription() {
    return {
      X: { description: 'Consistent demand (CV < 0.5)', forecasting: 'Reliable, quantitative methods' },
      Y: { description: 'Variable demand (CV 0.5–1.0)', forecasting: 'Moderate, combine methods' },
      Z: { description: 'Highly variable demand (CV > 1.0)', forecasting: 'Unreliable, qualitative methods' },
    };
  },
};
