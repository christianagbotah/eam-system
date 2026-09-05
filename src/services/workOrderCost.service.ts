import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { calculateWorkOrderLaborCost } from '@/services/workOrderLaborCost.service';

export interface AuthoritativeWorkOrderCostResult {
  plannedCost: number;
  actualLaborCost: number;
  actualMaterialCost: number;
  actualToolCost: number;
  actualContractorCost: number;
  totalActualCost: number;
  laborHours: number;
  incompleteLaborRate: boolean;
  toolCostNote?: string;
  warnings: string[];
  appliedLaborRate: number | null;
  appliedLaborCurrency: string | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Single server-authoritative cost calculation for Repairs work orders.
 *
 * Labor is delegated to workOrderLaborCost.service so every technician's
 * actual sessions are priced at that technician's effective historical rate.
 * Materials are costed from consumed + wasted quantities. Reusable tools remain
 * custody assets and therefore do not create a consumption charge. Contractor
 * cost is accepted only from the persisted server-side WorkOrder field.
 */
export async function calculateAuthoritativeWorkOrderCost(
  workOrderId: string,
  tx?: Prisma.TransactionClient,
): Promise<AuthoritativeWorkOrderCostResult | null> {
  const client = tx ?? db;

  const [wo, labor] = await Promise.all([
    client.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        totalCost: true,
        contractorCost: true,
        repairMaterialRequests: {
          select: {
            unitCost: true,
            consumedQty: true,
            wastedQty: true,
          },
        },
      },
    }),
    calculateWorkOrderLaborCost(workOrderId, tx),
  ]);

  if (!wo || !labor) return null;

  let materialCost = 0;
  for (const request of wo.repairMaterialRequests) {
    const quantity = (request.consumedQty ?? 0) + (request.wastedQty ?? 0);
    materialCost += quantity * (request.unitCost ?? 0);
  }
  materialCost = round2(materialCost);

  // Normal reusable tool checkout is custody, not consumption. Tool damage,
  // rental, hire, depreciation, or consumable-tool charges need an explicit
  // server-side cost model before they can enter authoritative WO cost.
  const toolCost = 0;
  const toolCostNote = 'Reusable tools in custody — no consumption cost';
  const contractorCost = round2(wo.contractorCost ?? 0);

  const warnings = [...labor.warnings];
  if (labor.incompleteLaborRate && labor.laborHours > 0) {
    warnings.push(
      'Total actual cost is incomplete because one or more labor segments could not be authoritatively priced.',
    );
  }

  return {
    plannedCost: round2(wo.totalCost ?? 0),
    actualLaborCost: labor.actualLaborCost,
    actualMaterialCost: materialCost,
    actualToolCost: toolCost,
    actualContractorCost: contractorCost,
    totalActualCost: round2(
      labor.actualLaborCost + materialCost + toolCost + contractorCost,
    ),
    laborHours: labor.laborHours,
    incompleteLaborRate: labor.incompleteLaborRate,
    toolCostNote,
    warnings,
    appliedLaborRate: labor.appliedLaborRate,
    appliedLaborCurrency: labor.appliedLaborCurrency,
  };
}
