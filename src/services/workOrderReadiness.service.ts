import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { checkTechnicianEligibility } from '@/services/technicianEligibility.service'

// ─── Public Types ───────────────────────────────────────────────────────────

export interface ReadinessCheckResult {
  ready: boolean
  blockers: ReadinessItem[]
  warnings: ReadinessItem[]
}

export interface ReadinessItem {
  code: string        // e.g. 'NO_TEAM', 'ACTIVE_TIMERS'
  category: string    // 'team', 'timer', 'tool', 'material', 'safety', 'task', 'evidence'
  message: string
  severity: 'blocker' | 'warning'
}

export type ReadinessCheckType = 'start' | 'complete' | 'verify' | 'close'

// ─── Internal: the shape returned by the single WO fetch ───────────────────

type WoReadinessData = {
  id: string
  status: string
  type: string
  plantId: string | null
  assignedTo: string | null
  totalCost: number
  laborCost: number
  partsCost: number
  contractorCost: number
  safetyNotes: string | null
  failureDescription: string | null
  tradeActivity: string | null
  teamMembers: { userId: string }[]
  teamMemberRequests: {
    id: string
    status: string
    requestedUserId: string | null
  }[]
  timeLogs: {
    id: string
    action: string
    endTime: DateTime | null
  }[]
  repairToolRequests: {
    id: string
    status: string
    items: {
      id: string
      pendingReturnQty: number | null
    }[]
  }[]
  repairMaterialRequests: {
    id: string
    status: string
    quantityIssued: number
    consumedQty: number | null
    wastedQty: number | null
  }[]
  repairCompletion: {
    id: string
    reworkCount: number
  } | null
  shiftHandovers: {
    id: string
    status: string
  }[]
  assignee?: {
    id: string
    status: string | null
    primaryTrade: string | null
    plantAccess: {
      id: string
      plantId: string
    }[]
  } | null
}

type DateTime = string | Date

// ─── Main Export ────────────────────────────────────────────────────────────

export async function checkReadiness(
  workOrderId: string,
  checkType: ReadinessCheckType,
  tx?: Prisma.TransactionClient,
): Promise<ReadinessCheckResult> {
  const client = tx ?? db

  const wo = await client.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      status: true,
      type: true,
      plantId: true,
      assignedTo: true,
      totalCost: true,
      laborCost: true,
      partsCost: true,
      contractorCost: true,
      safetyNotes: true,
      failureDescription: true,
      tradeActivity: true,
      teamMembers: { select: { userId: true } },
      teamMemberRequests: { select: { id: true, status: true, requestedUserId: true } },
      timeLogs: { select: { id: true, action: true, endTime: true } },
      repairToolRequests: {
        select: {
          id: true,
          status: true,
          items: { select: { id: true, pendingReturnQty: true } },
        },
      },
      repairMaterialRequests: {
        select: {
          id: true,
          status: true,
          quantityIssued: true,
          consumedQty: true,
          wastedQty: true,
        },
      },
      repairCompletion: { select: { id: true, reworkCount: true } },
      shiftHandovers: { select: { id: true, status: true } },
      assignee: {
        select: {
          id: true,
          status: true,
          primaryTrade: true,
          plantAccess: { select: { id: true, plantId: true } },
        },
      },
    },
  })

  if (!wo) {
    return {
      ready: false,
      blockers: [{
        code: 'WO_NOT_FOUND',
        category: 'task',
        message: `Work order ${workOrderId} not found`,
        severity: 'blocker',
      }],
      warnings: [],
    }
  }

  const blockers: ReadinessItem[] = []
  const warnings: ReadinessItem[] = []

  switch (checkType) {
    case 'start':
      await checkStartReadiness(wo, blockers, warnings)
      break
    case 'complete':
      checkCompletionReadiness(wo, blockers, warnings)
      break
    case 'verify':
      checkVerificationReadiness(wo, blockers, warnings)
      break
    case 'close':
      checkClosureReadiness(wo, blockers, warnings)
      break
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  }
}

// ─── Start Checks ───────────────────────────────────────────────────────────

async function checkStartReadiness(
  wo: WoReadinessData,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): Promise<void> {
  // NO_TEAM: no assignedTo and no team members
  if (!wo.assignedTo && wo.teamMembers.length === 0) {
    blockers.push({
      code: 'NO_TEAM',
      category: 'team',
      message: 'Work order has no assigned technician or team members',
      severity: 'blocker',
    })
  }

  // MANDATORY_HANDOVER_PENDING: WO is in pending_handover but no confirmed handover exists
  if (wo.status === 'pending_handover') {
    const confirmedHandover = wo.shiftHandovers.some((sh) => sh.status === 'confirmed')
    if (!confirmedHandover) {
      blockers.push({
        code: 'MANDATORY_HANDOVER_PENDING',
        category: 'safety',
        message: 'Work order is in pending_handover status — shift handover must be confirmed before resuming',
        severity: 'blocker',
      })
    }
  }

  // NO_PLANT_ACCESS: assignedTo user has no plant access for WO's plant
  if (wo.assignedTo && wo.plantId) {
    const hasPlantAccess = wo.assignee?.plantAccess.some(
      (pa) => pa.plantId === wo.plantId,
    ) ?? false

    if (!hasPlantAccess) {
      blockers.push({
        code: 'NO_PLANT_ACCESS',
        category: 'safety',
        message: `Assigned technician does not have access to plant ${wo.plantId}`,
        severity: 'blocker',
      })
    }
  }

  // REQUIRED_PERMIT_CHECK (WARNING): If safetyNotes mention 'permit' or 'LOTO', warn
  checkRequiredPermit(wo, warnings)

  // TECHNICIAN_ELIGIBILITY: Call the eligibility service for the assigned user
  await checkTechnicianEligibilityForStart(wo, blockers, warnings)
}

/**
 * REQUIRED_PERMIT_CHECK — WARNING
 *
 * If the WO has safetyNotes mentioning 'permit' or 'LOTO' (case-insensitive),
 * add a warning that required permits should be verified.
 * Uses existing WO data (safetyNotes field).
 *
 * NOTE: This is a WARNING, not a blocker. It would need configuration/policy
 * integration (e.g. a SafetyPermit linked to this WO) to become a blocker.
 */
function checkRequiredPermit(wo: WoReadinessData, warnings: ReadinessItem[]): void {
  if (!wo.safetyNotes) return

  const notesLower = wo.safetyNotes.toLowerCase()
  if (notesLower.includes('permit') || notesLower.includes('loto')) {
    warnings.push({
      code: 'REQUIRED_PERMIT_CHECK',
      category: 'safety',
      message: 'Work order safety notes mention permit/LOTO requirements — verify that all required permits are obtained before starting work',
      severity: 'warning',
    })
  }
}

/**
 * TECHNICIAN_ELIGIBILITY — Calls the existing technicianEligibility service
 * for the assignedTo user and merges any blockers/warnings into readiness.
 */
async function checkTechnicianEligibilityForStart(
  wo: WoReadinessData,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): Promise<void> {
  if (!wo.assignedTo) return

  try {
    const result = await checkTechnicianEligibility(wo.assignedTo, wo.id)

    for (const b of result.blockers) {
      blockers.push({
        code: `TECH_ELIG_${b.code}`,
        category: b.category,
        message: b.message,
        severity: 'blocker',
      })
    }

    for (const w of result.warnings) {
      warnings.push({
        code: `TECH_ELIG_${w.code}`,
        category: w.category,
        message: w.message,
        severity: 'warning',
      })
    }
  } catch {
    // Eligibility check failed — don't block start, but warn
    warnings.push({
      code: 'TECH_ELIG_CHECK_FAILED',
      category: 'task',
      message: 'Technician eligibility check could not be completed — proceed with caution',
      severity: 'warning',
    })
  }
}

// ─── Completion Checks ──────────────────────────────────────────────────────

function checkCompletionReadiness(
  wo: WoReadinessData,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): void {
  // ACTIVE_TIMERS: time log entries with action start/resume and no endTime
  const activeTimers = wo.timeLogs.filter(
    (tl) => (tl.action === 'start' || tl.action === 'resume') && !tl.endTime,
  )

  if (activeTimers.length > 0) {
    blockers.push({
      code: 'ACTIVE_TIMERS',
      category: 'timer',
      message: `${activeTimers.length} active time timer(s) must be stopped before completion`,
      severity: 'blocker',
    })
  }

  // TOOLS_ISSUED: tool request items still physically out
  const toolsOut = wo.repairToolRequests
    .filter((tr) => tr.status === 'issued')
    .flatMap((tr) => tr.items)
    .filter((item) => (item.pendingReturnQty ?? 0) > 0)

  if (toolsOut.length > 0) {
    blockers.push({
      code: 'TOOLS_ISSUED',
      category: 'tool',
      message: `${toolsOut.length} issued tool item(s) still pending return`,
      severity: 'blocker',
    })
  }

  // UNRECONCILED_MATERIALS: issued/picking materials not fully consumed/wasted
  checkUnreconciledMaterials(wo, blockers, 'UNRECONCILED_MATERIALS')

  // PENDING_ASSISTANCE: approved/pending requests whose user is not yet a team member
  const existingMemberIds = new Set(wo.teamMembers.map((m) => m.userId))

  const pendingAssistance = wo.teamMemberRequests.filter(
    (req) => {
      if (req.status !== 'pending' && req.status !== 'approved') return false
      if (!req.requestedUserId) return false
      return !existingMemberIds.has(req.requestedUserId)
    },
  )

  if (pendingAssistance.length > 0) {
    blockers.push({
      code: 'PENDING_ASSISTANCE',
      category: 'team',
      message: `${pendingAssistance.length} team member request(s) pending — requested user(s) not yet added`,
      severity: 'blocker',
    })
  }

  // UNRESOLVED_HANDOVER (blocker): shift handovers with status='pending'
  checkUnresolvedHandover(wo, blockers)

  // REQUIRED_FAILURE_CODING (warning): corrective/predictive with no failureDescription
  checkRequiredFailureCoding(wo, warnings)
}

/**
 * UNRESOLVED_HANDOVER — BLOCKER
 *
 * If there are shift handovers with status='pending' for this WO, block completion.
 * Uses existing shiftHandovers data already fetched.
 */
function checkUnresolvedHandover(wo: WoReadinessData, blockers: ReadinessItem[]): void {
  const pendingHandovers = wo.shiftHandovers.filter((sh) => sh.status === 'pending')

  if (pendingHandovers.length > 0) {
    blockers.push({
      code: 'UNRESOLVED_HANDOVER',
      category: 'safety',
      message: `${pendingHandovers.length} shift handover(s) still pending — all handovers must be confirmed before completion`,
      severity: 'blocker',
    })
  }
}

/**
 * REQUIRED_FAILURE_CODING — WARNING
 *
 * If WO type is corrective or predictive and failureDescription is null/empty,
 * warn that failure mode/cause/remedy should be entered.
 * Uses existing WO fields (type, failureDescription).
 */
function checkRequiredFailureCoding(wo: WoReadinessData, warnings: ReadinessItem[]): void {
  if (wo.type !== 'corrective' && wo.type !== 'predictive') return
  if (wo.failureDescription && wo.failureDescription.trim().length > 0) return

  warnings.push({
    code: 'REQUIRED_FAILURE_CODING',
    category: 'evidence',
    message: `Work order type is "${wo.type}" but no failure description has been entered — failure mode, cause, and remedy should be documented`,
    severity: 'warning',
  })
}

// ─── Verification Checks ────────────────────────────────────────────────────

function checkVerificationReadiness(
  wo: WoReadinessData,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): void {
  // NO_COMPLETION_REPORT: RepairCompletion record doesn't exist
  if (!wo.repairCompletion) {
    blockers.push({
      code: 'NO_COMPLETION_REPORT',
      category: 'evidence',
      message: 'No completion report has been submitted for this work order',
      severity: 'blocker',
    })
  }

  // TOOLS_OUTSTANDING: same as completion tool custody check
  checkToolCustody(wo, blockers)

  // UNRESOLVED_MATERIALS: same as completion material check
  checkMaterialReconciliation(wo, blockers)

  // INCOMPLETE_COST_WARNING (warning): no labor hours and no material costs
  checkIncompleteCostWarning(wo, warnings)
}

/**
 * INCOMPLETE_COST_WARNING — WARNING
 *
 * If the WO has no labor hours logged (no time logs) and no material costs,
 * warn that cost data is incomplete.
 * Uses existing WO fields (timeLogs, repairMaterialRequests).
 */
function checkIncompleteCostWarning(wo: WoReadinessData, warnings: ReadinessItem[]): void {
  const hasTimeLogs = wo.timeLogs.length > 0
  const hasMaterialCosts = wo.repairMaterialRequests.some(
    (mr) => mr.quantityIssued > 0 && ((mr.consumedQty ?? 0) > 0 || (mr.wastedQty ?? 0) > 0),
  )

  if (!hasTimeLogs && !hasMaterialCosts) {
    warnings.push({
      code: 'INCOMPLETE_COST_WARNING',
      category: 'evidence',
      message: 'No labor hours or material costs have been recorded — cost data appears incomplete for verification',
      severity: 'warning',
    })
  }
}

// ─── Closure Checks ─────────────────────────────────────────────────────────

function checkClosureReadiness(
  wo: WoReadinessData,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): void {
  // NOT_VERIFIED: WO status is not 'verified'
  if (wo.status !== 'verified') {
    blockers.push({
      code: 'NOT_VERIFIED',
      category: 'task',
      message: `Work order status is '${wo.status}', must be 'verified' before closure`,
      severity: 'blocker',
    })
  }

  // OPEN_TOOL_CUSTODY: same as completion tools
  checkToolCustody(wo, blockers)

  // OPEN_MATERIAL_RECONCILIATION: same as completion materials
  checkMaterialReconciliation(wo, blockers)

  // INCOMPLETE_COST: no cost data entered
  if (wo.totalCost === 0 && (wo.laborCost + wo.partsCost + wo.contractorCost) === 0) {
    blockers.push({
      code: 'INCOMPLETE_COST',
      category: 'evidence',
      message: 'No cost data has been recorded for this work order',
      severity: 'blocker',
    })
  }

  // OPEN_REWORK: WO has reworkCount > 0 and status is not 'verified' (safety check)
  if (wo.repairCompletion && wo.repairCompletion.reworkCount > 0 && wo.status !== 'verified') {
    blockers.push({
      code: 'OPEN_REWORK',
      category: 'quality',
      message: `Repair completion has ${wo.repairCompletion.reworkCount} rework(s) — work order must be re-verified before closure`,
      severity: 'blocker',
    })
  }

  // AUTHORITATIVE_COST_UNAVAILABLE (warning): totalCost is 0 and no time logs
  checkAuthoritativeCostUnavailable(wo, warnings)
}

/**
 * AUTHORITATIVE_COST_UNAVAILABLE — WARNING
 *
 * If totalCost is 0 and no time logs exist, warn that authoritative cost
 * calculation may be incomplete.
 * Uses existing WO fields (totalCost, timeLogs).
 */
function checkAuthoritativeCostUnavailable(wo: WoReadinessData, warnings: ReadinessItem[]): void {
  if (wo.totalCost > 0) return
  if (wo.timeLogs.length > 0) return

  warnings.push({
    code: 'AUTHORITATIVE_COST_UNAVAILABLE',
    category: 'evidence',
    message: 'Total cost is zero and no time logs exist — authoritative cost calculation may be incomplete',
    severity: 'warning',
  })
}

// ─── Shared Sub-checks ──────────────────────────────────────────────────────

function checkToolCustody(wo: WoReadinessData, out: ReadinessItem[]): void {
  const toolsOut = wo.repairToolRequests
    .filter((tr) => tr.status === 'issued')
    .flatMap((tr) => tr.items)
    .filter((item) => (item.pendingReturnQty ?? 0) > 0)

  if (toolsOut.length > 0) {
    out.push({
      code: 'OPEN_TOOL_CUSTODY',
      category: 'tool',
      message: `${toolsOut.length} issued tool item(s) still pending return`,
      severity: 'blocker',
    })
  }
}

function checkUnreconciledMaterials(
  wo: WoReadinessData,
  out: ReadinessItem[],
  code: string,
): void {
  const unreconciled = wo.repairMaterialRequests.filter(
    (mr) => {
      if (mr.status !== 'issued' && mr.status !== 'picking') return false
      const accounted = (mr.consumedQty ?? 0) + (mr.wastedQty ?? 0)
      return accounted < mr.quantityIssued
    },
  )

  if (unreconciled.length > 0) {
    out.push({
      code,
      category: 'material',
      message: `${unreconciled.length} material request(s) have unaccounted issued quantity`,
      severity: 'blocker',
    })
  }
}

function checkMaterialReconciliation(wo: WoReadinessData, out: ReadinessItem[]): void {
  checkUnreconciledMaterials(wo, out, 'OPEN_MATERIAL_RECONCILIATION')
}
