import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

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
  plantId: string | null
  assignedTo: string | null
  totalCost: number
  laborCost: number
  partsCost: number
  contractorCost: number
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
  } | null
  assignee?: {
    id: string
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
      plantId: true,
      assignedTo: true,
      totalCost: true,
      laborCost: true,
      partsCost: true,
      contractorCost: true,
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
      repairCompletion: { select: { id: true } },
      assignee: {
        select: {
          id: true,
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
      checkStartBlockers(wo, blockers)
      break
    case 'complete':
      checkCompletionBlockers(wo, blockers)
      break
    case 'verify':
      checkVerificationBlockers(wo, blockers)
      break
    case 'close':
      checkClosureBlockers(wo, blockers)
      break
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  }
}

// ─── Start Checks ───────────────────────────────────────────────────────────

function checkStartBlockers(wo: WoReadinessData, out: ReadinessItem[]): void {
  // NO_TEAM: no assignedTo and no team members
  if (!wo.assignedTo && wo.teamMembers.length === 0) {
    out.push({
      code: 'NO_TEAM',
      category: 'team',
      message: 'Work order has no assigned technician or team members',
      severity: 'blocker',
    })
  }

  // NO_PLANT_ACCESS: assignedTo user has no plant access for WO's plant
  if (wo.assignedTo && wo.plantId) {
    const hasPlantAccess = wo.assignee?.plantAccess.some(
      (pa) => pa.plantId === wo.plantId,
    ) ?? false

    if (!hasPlantAccess) {
      out.push({
        code: 'NO_PLANT_ACCESS',
        category: 'safety',
        message: `Assigned technician does not have access to plant ${wo.plantId}`,
        severity: 'blocker',
      })
    }
  }
}

// ─── Completion Checks ──────────────────────────────────────────────────────

function checkCompletionBlockers(wo: WoReadinessData, out: ReadinessItem[]): void {
  // ACTIVE_TIMERS: time log entries with action start/resume and no endTime
  const activeTimers = wo.timeLogs.filter(
    (tl) => (tl.action === 'start' || tl.action === 'resume') && !tl.endTime,
  )

  if (activeTimers.length > 0) {
    out.push({
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
    out.push({
      code: 'TOOLS_ISSUED',
      category: 'tool',
      message: `${toolsOut.length} issued tool item(s) still pending return`,
      severity: 'blocker',
    })
  }

  // UNRECONCILED_MATERIALS: issued/picking materials not fully consumed/wasted
  const unreconciled = wo.repairMaterialRequests.filter(
    (mr) => {
      if (mr.status !== 'issued' && mr.status !== 'picking') return false
      const accounted = (mr.consumedQty ?? 0) + (mr.wastedQty ?? 0)
      return accounted < mr.quantityIssued
    },
  )

  if (unreconciled.length > 0) {
    out.push({
      code: 'UNRECONCILED_MATERIALS',
      category: 'material',
      message: `${unreconciled.length} material request(s) have unaccounted issued quantity`,
      severity: 'blocker',
    })
  }

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
    out.push({
      code: 'PENDING_ASSISTANCE',
      category: 'team',
      message: `${pendingAssistance.length} team member request(s) pending — requested user(s) not yet added`,
      severity: 'blocker',
    })
  }
}

// ─── Verification Checks ────────────────────────────────────────────────────

function checkVerificationBlockers(wo: WoReadinessData, out: ReadinessItem[]): void {
  // NO_COMPLETION_REPORT: RepairCompletion record doesn't exist
  if (!wo.repairCompletion) {
    out.push({
      code: 'NO_COMPLETION_REPORT',
      category: 'evidence',
      message: 'No completion report has been submitted for this work order',
      severity: 'blocker',
    })
  }

  // UNRESOLVED_CUSTODY: same as completion tool/material blockers
  checkToolCustody(wo, out)
  checkMaterialReconciliation(wo, out)
}

// ─── Closure Checks ─────────────────────────────────────────────────────────

function checkClosureBlockers(wo: WoReadinessData, out: ReadinessItem[]): void {
  // NOT_VERIFIED: WO status is not 'verified'
  if (wo.status !== 'verified') {
    out.push({
      code: 'NOT_VERIFIED',
      category: 'task',
      message: `Work order status is '${wo.status}', must be 'verified' before closure`,
      severity: 'blocker',
    })
  }

  // OPEN_TOOL_CUSTODY: same as completion tools
  checkToolCustody(wo, out)

  // OPEN_MATERIAL_RECONCILIATION: same as completion materials
  checkMaterialReconciliation(wo, out)

  // INCOMPLETE_COST: no cost data entered
  if (wo.totalCost === 0 && (wo.laborCost + wo.partsCost + wo.contractorCost) === 0) {
    out.push({
      code: 'INCOMPLETE_COST',
      category: 'evidence',
      message: 'No cost data has been recorded for this work order',
      severity: 'blocker',
    })
  }
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

function checkMaterialReconciliation(wo: WoReadinessData, out: ReadinessItem[]): void {
  const unreconciled = wo.repairMaterialRequests.filter(
    (mr) => {
      if (mr.status !== 'issued' && mr.status !== 'picking') return false
      const accounted = (mr.consumedQty ?? 0) + (mr.wastedQty ?? 0)
      return accounted < mr.quantityIssued
    },
  )

  if (unreconciled.length > 0) {
    out.push({
      code: 'OPEN_MATERIAL_RECONCILIATION',
      category: 'material',
      message: `${unreconciled.length} material request(s) have unaccounted issued quantity`,
      severity: 'blocker',
    })
  }
}
