/**
 * Technician Eligibility Service
 *
 * Checks whether a technician is eligible to be assigned or work on a given WO.
 * Uses existing User, UserSkill, UserPlant, WorkOrder fields — no new HR structures.
 */

import { db } from '@/lib/db'

export interface EligibilityResult {
  eligible: boolean
  blockers: Array<{ code: string; message: string; category: string }>
  warnings: Array<{ code: string; message: string; category: string }>
}

/**
 * Check technician eligibility for a work order.
 *
 * Checks:
 * - BLOCKER: User status is not 'active' → INACTIVE_USER
 * - BLOCKER: User has no plant access for WO's plant → NO_PLANT_ACCESS
 * - WARNING: User's primaryTrade doesn't match WO's tradeActivity → TRADE_MISMATCH
 * - WARNING: User has conflicting active WO → CONFLICTING_WORK
 */
export async function checkTechnicianEligibility(
  userId: string,
  workOrderId: string,
): Promise<EligibilityResult> {
  const blockers: EligibilityResult['blockers'] = []
  const warnings: EligibilityResult['warnings'] = []

  // Fetch user with relevant relations
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      primaryTrade: true,
      plantAccess: { select: { plantId: true } },
      userSkills: { select: { tradeId: true } },
    },
  })

  if (!user) {
    return {
      eligible: false,
      blockers: [{ code: 'USER_NOT_FOUND', message: `User ${userId} not found`, category: 'user' }],
      warnings: [],
    }
  }

  // Fetch work order
  const wo = await db.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      plantId: true,
      tradeActivity: true,
      departmentId: true,
    },
  })

  if (!wo) {
    return {
      eligible: false,
      blockers: [{ code: 'WO_NOT_FOUND', message: `Work order ${workOrderId} not found`, category: 'task' }],
      warnings: [],
    }
  }

  // BLOCKER: User status is not 'active'
  if (user.status && user.status !== 'active') {
    blockers.push({
      code: 'INACTIVE_USER',
      message: `User status is "${user.status}" — only active users can be assigned to work orders`,
      category: 'user',
    })
  }

  // BLOCKER: No plant access for WO's plant
  if (wo.plantId) {
    const hasPlantAccess = user.plantAccess.some((pa) => pa.plantId === wo.plantId)
    if (!hasPlantAccess) {
      blockers.push({
        code: 'NO_PLANT_ACCESS',
        message: `User does not have access to plant ${wo.plantId} where this work order is located`,
        category: 'plant',
      })
    }
  }

  // WARNING: Primary trade doesn't match WO's tradeActivity
  if (user.primaryTrade && wo.tradeActivity && user.primaryTrade !== wo.tradeActivity) {
    warnings.push({
      code: 'TRADE_MISMATCH',
      message: `User's primary trade ("${user.primaryTrade}") does not match WO trade activity ("${wo.tradeActivity}")`,
      category: 'skill',
    })
  }

  // WARNING: Conflicting active WO
  const activeWoStatuses = ['in_progress', 'waiting_parts', 'waiting_tools', 'waiting_shutdown', 'waiting_permit', 'on_hold']
  const conflictingWos = await db.workOrder.count({
    where: {
      id: { not: workOrderId },
      OR: [
        { assignedTo: userId },
        { teamMembers: { some: { userId } } },
      ],
      status: { in: activeWoStatuses },
    },
  })

  if (conflictingWos > 0) {
    warnings.push({
      code: 'CONFLICTING_WORK',
      message: `User has ${conflictingWos} active work order(s) that may conflict with this assignment`,
      category: 'schedule',
    })
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    warnings,
  }
}
