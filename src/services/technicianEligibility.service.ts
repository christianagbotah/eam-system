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
 * - WARNING: User has no UserSkill records at all → NO_SKILL_RECORD
 * - WARNING: User not certified for the WO's required trade → NO_CERTIFICATION
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
      userSkills: {
        select: {
          tradeId: true,
          proficiencyLevel: true,
          certified: true,
          yearsExperience: true,
          trade: { select: { id: true, name: true, code: true, category: true } },
        },
      },
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

  // WARNING: No skill records at all
  checkNoSkillRecord(user.userSkills, warnings)

  // WARNING: Not certified for the WO's required trade
  checkNoCertification(user, wo.tradeActivity, warnings)

  return {
    eligible: blockers.length === 0,
    blockers,
    warnings,
  }
}

/**
 * NO_SKILL_RECORD — WARNING
 *
 * If the user has no UserSkill records at all, warn that no trade/skill
 * certifications are on file. Uses the existing UserSkill model.
 */
function checkNoSkillRecord(
  userSkills: Array<{ tradeId: string }>,
  warnings: EligibilityResult['warnings'],
): void {
  if (userSkills.length === 0) {
    warnings.push({
      code: 'NO_SKILL_RECORD',
      message: 'No trade or skill certifications are on file for this technician',
      category: 'skill',
    })
  }
}

/**
 * NO_CERTIFICATION — WARNING
 *
 * If the WO requires a specific trade (tradeActivity) and the user's UserSkill
 * for that trade has `certified: false`, warn that the technician is not
 * certified for this trade. Matches by looking up the Trade record associated
 * with each UserSkill and comparing against the WO's tradeActivity.
 */
function checkNoCertification(
  user: {
    primaryTrade: string | null
    userSkills: Array<{
      tradeId: string
      proficiencyLevel: string
      certified: boolean
      yearsExperience: number | null
      trade: { id: string; name: string; code: string; category: string | null }
    }>
  },
  tradeActivity: string | null,
  warnings: EligibilityResult['warnings'],
): void {
  if (!tradeActivity) return

  const tradeLower = tradeActivity.toLowerCase()

  // Find UserSkill records matching the WO's tradeActivity.
  // Match against the Trade's name, code, or category (all case-insensitive).
  const matchingSkills = user.userSkills.filter((us) => {
    const trade = us.trade
    return (
      trade.name.toLowerCase() === tradeLower ||
      trade.code.toLowerCase() === tradeLower ||
      (trade.category && trade.category.toLowerCase() === tradeLower)
    )
  })

  // Also check primaryTrade string match (in case no UserSkill link exists but
  // primaryTrade field matches)
  const primaryTradeMatches = user.primaryTrade
    ?.toLowerCase() === tradeLower

  // If there's no matching skill at all and primaryTrade doesn't match either,
  // skip — the TRADE_MISMATCH warning already covers this scenario.
  if (matchingSkills.length === 0 && !primaryTradeMatches) return

  // If there are matching skills, check if any is certified
  if (matchingSkills.length > 0) {
    const anyCertified = matchingSkills.some((us) => us.certified)
    if (!anyCertified) {
      const tradeNames = matchingSkills
        .map((us) => us.trade.name)
        .join(', ')
      warnings.push({
        code: 'NO_CERTIFICATION',
        message: `Technician has skill(s) for "${tradeNames}" but is not certified for this trade — certification verification recommended`,
        category: 'skill',
      })
    }
  }
}
