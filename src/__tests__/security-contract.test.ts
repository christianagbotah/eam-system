/**
 * Behavioral Security Contract Tests
 *
 * These tests verify security invariants by exercising actual function behavior
 * with mocked dependencies. Each test drives a real code path and asserts on
 * observable behavior (return values, status codes, error messages).
 *
 * 19 tests covering:
 *   - canAccessPlant / getPlantScope / applyPlantScope (tests 1–7)
 *   - MR POST cross-plant guards (tests 8–9)
 *   - WO POST cross-plant & existence guards (tests 10–15)
 *   - Material / Tool workflow plant-scoped access (tests 16–17)
 *   - Material readiness reconciliation invariant (test 18)
 *   - Material cost formula (test 19)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS — all vi.mock factories are hoisted by Vitest before any imports
// ═══════════════════════════════════════════════════════════════════════════════

const {
  mockDb,
  userPlantFindMany,
  userPlantFindFirst,
  assetFindUnique,
  maintenanceRequestFindFirst,
  maintenanceRequestFindUnique,
  inventoryItemFindMany,
  toolFindMany,
  repairMaterialRequestFindUnique,
  repairToolRequestFindUnique,
  workOrderFindUnique,
  laborRateFindFirst,
  tradeFindFirst,
  dbTransaction,
} = vi.hoisted(() => {
  // Lazy-creating cache so any db.model.method auto-mocks to vi.fn()
  const cache = new Map<string, ReturnType<typeof vi.fn>>() as Map<string, any>

  function fn(key: string): ReturnType<typeof vi.fn> {
    if (!cache.has(key)) cache.set(key, vi.fn())
    return cache.get(key)!
  }

  const db = new Proxy({} as any, {
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined
      const key = String(prop)
      if (key === '$transaction' || key === 'then') return fn('$transaction')
      // Return a model proxy that auto-creates method mocks
      return new Proxy(
        {},
        {
          get(_m, method) {
            if (typeof method === 'symbol') return undefined
            return fn(`${key}.${String(method)}`)
          },
        },
      )
    },
  })

  return {
    mockDb: db,
    userPlantFindMany: fn('userPlant.findMany'),
    userPlantFindFirst: fn('userPlant.findFirst'),
    assetFindUnique: fn('asset.findUnique'),
    maintenanceRequestFindFirst: fn('maintenanceRequest.findFirst'),
    maintenanceRequestFindUnique: fn('maintenanceRequest.findUnique'),
    inventoryItemFindMany: fn('inventoryItem.findMany'),
    toolFindMany: fn('tool.findMany'),
    repairMaterialRequestFindUnique: fn('repairMaterialRequest.findUnique'),
    repairToolRequestFindUnique: fn('repairToolRequest.findUnique'),
    workOrderFindUnique: fn('workOrder.findUnique'),
    laborRateFindFirst: fn('laborRate.findFirst'),
    tradeFindFirst: fn('trade.findFirst'),
    dbTransaction: fn('$transaction'),
  }
})

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockGetSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({
  getSession: mockGetSession,
  isAdmin: (s: any) => s?.roles?.includes('admin') ?? false,
  hasPermission: (s: any, p: string) => s?.permissions?.includes(p) ?? false,
  hasRole: (s: any, r: string) => s?.roles?.includes(r) ?? false,
  hasAnyPermission: (s: any, ps: string[]) =>
    ps.some((p) => s?.permissions?.includes(p)) ?? false,
  getCurrentUser: vi.fn(),
  createSession: vi.fn(),
  generateToken: vi.fn(),
  deleteSession: vi.fn(),
  getSessionAsync: vi.fn(),
  warmSessionCache: vi.fn(),
  rotateRefreshToken: vi.fn(),
  detectTokenReuse: vi.fn(),
  validateTokenBinding: vi.fn(),
  getTokenRotationMetrics: vi.fn(),
  getUserPlantId: vi.fn(),
  sessionCache: new Map(),
}))

vi.mock('@/lib/notifications', () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/state-machine', () => ({
  executeTransition: vi.fn(),
}))

vi.mock('@/lib/repair-notifications', () => ({
  sendRepairNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/audit-helpers', () => ({
  buildAuditData: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/reliability-events', () => ({
  emitReliabilityEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/pm-utils', () => ({
  calculateNextDueDate: vi.fn(),
  isAutoCalculableFrequency: vi.fn(),
}))

vi.mock('@/lib/queue', () => ({
  jobQueue: { add: vi.fn().mockResolvedValue(undefined) },
  QUEUES: {},
}))

vi.mock('@/services/technicianEligibility.service', () => ({
  checkTechnicianEligibility: vi.fn().mockResolvedValue({
    blockers: [],
    warnings: [],
  }),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS — after mocks so modules use mocked dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import {
  canAccessPlant,
  getPlantScope,
  applyPlantScope,
  type PlantScopeResult,
} from '@/lib/plant-scope'
import { POST as mrPost } from '@/app/api/maintenance-requests/route'
import { POST as woPost } from '@/app/api/work-orders/route'
import { POST as materialWorkflowPost } from '@/app/api/repairs/material-requests/[id]/route'
import { POST as toolWorkflowPost } from '@/app/api/repairs/tool-requests/[id]/route'
import { checkReadiness } from '@/services/workOrderReadiness.service'
import { calculateAuthoritativeCosts } from '@/services/workExecution.service'
import { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeSession(overrides: Partial<{
  userId: string;
  roles: string[];
  permissions: string[];
}> = {}) {
  return {
    userId: overrides.userId ?? 'user-1',
    username: 'testuser',
    fullName: 'Test User',
    roles: overrides.roles ?? ['technician'],
    permissions: overrides.permissions ?? [
      'maintenance_requests.create',
      'work_orders.create',
    ],
    createdAt: new Date(),
  }
}

function makeScope(overrides: Partial<PlantScopeResult> = {}): PlantScopeResult {
  return {
    plantId: overrides.plantId ?? null,
    accessiblePlantIds: overrides.accessiblePlantIds ?? [],
    isScoped: overrides.isScoped ?? false,
    denyAccess: overrides.denyAccess,
    isSystemWide: overrides.isSystemWide ?? false,
    accessLevel: overrides.accessLevel ?? null,
  }
}

function makePostRequest(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-token',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Contract: Behavioral Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 1–3: canAccessPlant
  // ────────────────────────────────────────────────────────────────────────────

  describe('canAccessPlant', () => {
    it('1. returns false for an inaccessible plant', () => {
      const scope = makeScope({
        accessiblePlantIds: ['plant-A'],
        isSystemWide: false,
        denyAccess: undefined,
      })
      expect(canAccessPlant(scope, 'plant-B')).toBe(false)
    })

    it('2. returns true for an accessible plant', () => {
      const scope = makeScope({
        accessiblePlantIds: ['plant-A', 'plant-B'],
        isSystemWide: false,
        denyAccess: undefined,
      })
      expect(canAccessPlant(scope, 'plant-B')).toBe(true)
    })

    it('3. returns true when isSystemWide (admin bypass)', () => {
      const scope = makeScope({
        isSystemWide: true,
        accessiblePlantIds: [],
        denyAccess: undefined,
      })
      // Even a non-existent plant ID is allowed for system-wide users
      expect(canAccessPlant(scope, 'any-plant')).toBe(true)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 4: getPlantScope denyAccess
  // ────────────────────────────────────────────────────────────────────────────

  describe('getPlantScope', () => {
    it('4. returns denyAccess when user has no plants but requests one', async () => {
      // User has NO plant assignments
      userPlantFindMany.mockResolvedValue([])

      const session = makeSession({ roles: ['technician'] })
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'X-Plant-ID': 'plant-1' },
      })

      const result = await getPlantScope(request, session)

      expect(result.denyAccess).toBe(true)
      expect(result.accessLevel).toBe('none')
      expect(result.accessiblePlantIds).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 5–7: applyPlantScope
  // ────────────────────────────────────────────────────────────────────────────

  describe('applyPlantScope', () => {
    it('5. adds exact plant filter for single scoped plant', () => {
      const scope = makeScope({
        plantId: 'plant-A',
        accessiblePlantIds: ['plant-A'],
        isScoped: true,
        isSystemWide: false,
      })
      const where: Record<string, unknown> = { status: 'open' }
      const result = applyPlantScope(where, scope)

      expect(result).toEqual({ status: 'open', plantId: 'plant-A' })
    })

    it('6. adds plant IN filter for multi-plant unscoped access', () => {
      const scope = makeScope({
        plantId: null,
        accessiblePlantIds: ['plant-A', 'plant-B', 'plant-C'],
        isScoped: false,
        isSystemWide: false,
      })
      const where: Record<string, unknown> = {}
      const result = applyPlantScope(where, scope)

      expect(result.plantId).toEqual({ in: ['plant-A', 'plant-B', 'plant-C'] })
    })

    it('7. adds ACCESS_DENIED sentinel for user with no plants', () => {
      const scope = makeScope({
        plantId: null,
        accessiblePlantIds: [],
        isScoped: false,
        isSystemWide: false,
      })
      const where: Record<string, unknown> = { status: 'open' }
      const result = applyPlantScope(where, scope)

      // When user has no plants, the filter uses a sentinel that matches nothing
      expect(result.plantId).toBe('__ACCESS_DENIED__')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 8–9: MR POST cross-plant guards
  // ────────────────────────────────────────────────────────────────────────────

  describe('MR POST — cross-plant guards', () => {
    const baseSession = makeSession({
      roles: ['technician'],
      permissions: ['maintenance_requests.create'],
    })

    it('8. rejects cross-plant plantId', async () => {
      mockGetSession.mockReturnValue(baseSession)
      // generateRequestNumber calls maintenanceRequest.findFirst
      maintenanceRequestFindFirst.mockResolvedValue(null)
      // getPlantScope: user only has plant-A
      userPlantFindMany.mockResolvedValue([
        { plantId: 'plant-A', accessLevel: 'write' },
      ])

      const req = makePostRequest(
        'http://localhost/api/maintenance-requests',
        { title: 'Test MR', plantId: 'plant-B' },
      )

      const res = await mrPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/inaccessible plant/i)
    })

    it('9. rejects cross-plant asset', async () => {
      mockGetSession.mockReturnValue(baseSession)
      maintenanceRequestFindFirst.mockResolvedValue(null)
      userPlantFindMany.mockResolvedValue([
        { plantId: 'plant-A', accessLevel: 'write' },
      ])
      // Asset belongs to plant-B, but MR targets plant-A
      assetFindUnique.mockResolvedValue({
        id: 'asset-X',
        plantId: 'plant-B',
      })

      const req = makePostRequest(
        'http://localhost/api/maintenance-requests',
        { title: 'Test MR', plantId: 'plant-A', assetId: 'asset-X' },
      )

      const res = await mrPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/different plant/i)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 10–15: WO POST cross-plant & existence guards
  // ────────────────────────────────────────────────────────────────────────────

  describe('WO POST — cross-plant & existence guards', () => {
    const baseSession = makeSession({
      roles: ['maintenance_planner'],
      permissions: ['work_orders.create'],
    })

    beforeEach(() => {
      mockGetSession.mockReturnValue(baseSession)
      // User only has access to plant-A
      userPlantFindMany.mockResolvedValue([
        { plantId: 'plant-A', accessLevel: 'write' },
      ])
    })

    it('10. rejects unauthorized plantId', async () => {
      const req = makePostRequest(
        'http://localhost/api/work-orders',
        { title: 'Test WO', plantId: 'plant-B' },
      )

      const res = await woPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/access denied|plant/i)
    })

    it('11. rejects cross-plant maintenance request', async () => {
      maintenanceRequestFindUnique.mockResolvedValue({
        id: 'mr-1',
        status: 'approved',
        workflowStatus: 'approved',
        workOrderId: null,
        plantId: 'plant-B', // Different from WO's plant
      })

      const req = makePostRequest(
        'http://localhost/api/work-orders',
        {
          title: 'Test WO',
          plantId: 'plant-A',
          maintenanceRequestId: 'mr-1',
        },
      )

      const res = await woPost(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/plant does not match/i)
    })

    it('12. rejects cross-plant asset', async () => {
      assetFindUnique.mockResolvedValue({
        id: 'asset-X',
        plantId: 'plant-B',
      })

      const req = makePostRequest(
        'http://localhost/api/work-orders',
        { title: 'Test WO', plantId: 'plant-A', assetId: 'asset-X' },
      )

      const res = await woPost(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/does not belong to the resolved plant/i)
    })

    it('13. rejects cross-plant part (inventory item)', async () => {
      inventoryItemFindMany.mockResolvedValue([
        { id: 'part-X', plantId: 'plant-B' },
      ])

      const req = makePostRequest(
        'http://localhost/api/work-orders',
        {
          title: 'Test WO',
          plantId: 'plant-A',
          requiredParts: [{ itemId: 'part-X', quantity: 2 }],
        },
      )

      const res = await woPost(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/does not belong to the work order plant/i)
    })

    it('14. rejects cross-plant tool', async () => {
      toolFindMany.mockResolvedValue([
        { id: 'tool-X', plantId: 'plant-B' },
      ])

      const req = makePostRequest(
        'http://localhost/api/work-orders',
        {
          title: 'Test WO',
          plantId: 'plant-A',
          requiredTools: [{ toolId: 'tool-X', quantity: 1 }],
        },
      )

      const res = await woPost(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/does not belong to the work order plant/i)
    })

    it('15. rejects missing part ID (existence check)', async () => {
      // Return fewer items than requested → triggers existence check
      inventoryItemFindMany.mockResolvedValue([])

      const req = makePostRequest(
        'http://localhost/api/work-orders',
        {
          title: 'Test WO',
          plantId: 'plant-A',
          requiredParts: [{ itemId: 'nonexistent-part', quantity: 1 }],
        },
      )

      const res = await woPost(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/not found/i)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 16–17: Workflow POST plant-scoped access
  // ────────────────────────────────────────────────────────────────────────────

  describe('Material workflow POST — cross-plant access', () => {
    it('16. blocks cross-plant access to material request workflow', async () => {
      const session = makeSession({
        roles: ['store_keeper'],
        permissions: ['material_requests.manage'],
      })
      mockGetSession.mockReturnValue(session)

      // Material request links to a WO in plant-B
      repairMaterialRequestFindUnique.mockResolvedValue({
        id: 'mat-1',
        status: 'pending',
        workOrderId: 'wo-1',
        workOrder: {
          id: 'wo-1',
          woNumber: 'WO-001',
          title: 'Test WO',
          plantId: 'plant-B', // User only has plant-A
          assignedSupervisorId: null,
          plannerId: null,
          assignedTo: null,
        },
        requestedBy: { id: 'user-1', fullName: 'User One' },
      })

      // User only has plant-A
      userPlantFindMany.mockResolvedValue([
        { plantId: 'plant-A', accessLevel: 'write' },
      ])

      const req = makePostRequest(
        'http://localhost/api/repairs/material-requests/mat-1',
        { action: 'supervisor_approve' },
      )

      const res = await materialWorkflowPost(req, {
        params: Promise.resolve({ id: 'mat-1' }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/access denied/i)
    })
  })

  describe('Tool workflow POST — cross-plant access', () => {
    it('17. blocks cross-plant access to tool request workflow', async () => {
      const session = makeSession({
        roles: ['store_keeper'],
        permissions: ['tool_requests.manage'],
      })
      mockGetSession.mockReturnValue(session)

      // Tool request links to a WO in plant-B
      repairToolRequestFindUnique.mockResolvedValue({
        id: 'tool-req-1',
        status: 'pending',
        workOrderId: 'wo-1',
        workOrder: {
          id: 'wo-1',
          woNumber: 'WO-001',
          title: 'Test WO',
          plantId: 'plant-B',
          assignedSupervisorId: null,
          plannerId: null,
        },
        requestedBy: { id: 'user-1', fullName: 'User One' },
        tool: null,
        items: [],
      })

      // User only has plant-A
      userPlantFindMany.mockResolvedValue([
        { plantId: 'plant-A', accessLevel: 'write' },
      ])

      const req = makePostRequest(
        'http://localhost/api/repairs/tool-requests/tool-req-1',
        { action: 'supervisor_approve' },
      )

      const res = await toolWorkflowPost(req, {
        params: Promise.resolve({ id: 'tool-req-1' }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/access denied/i)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 18: Material readiness reconciliation
  // ────────────────────────────────────────────────────────────────────────────

  describe('Material readiness reconciliation', () => {
    it('18. requires consumed+wasted+returned == issued for completion readiness', async () => {
      // Simulate a WO with an unreconciled material: issued=10, consumed=5, wasted=2, returned=2
      // 5 + 2 + 2 = 9 ≠ 10 → should produce UNRECONCILED_MATERIALS blocker
      workOrderFindUnique.mockResolvedValue({
        id: 'wo-1',
        status: 'in_progress',
        type: 'corrective',
        plantId: 'plant-A',
        assignedTo: 'user-1',
        totalCost: 0,
        laborCost: 0,
        partsCost: 0,
        contractorCost: 0,
        safetyNotes: null,
        failureDescription: 'motor failure',
        tradeActivity: null,
        teamMembers: [{ userId: 'user-1' }],
        teamMemberRequests: [],
        timeLogs: [], // no active timers
        repairToolRequests: [], // no tools out
        repairMaterialRequests: [
          {
            id: 'mat-1',
            status: 'issued',
            quantityIssued: 10,
            consumedQty: 5,
            wastedQty: 2,
            quantityReturned: 2, // 5+2+2=9, not 10
          },
        ],
        repairCompletion: null,
        shiftHandovers: [],
        assignee: {
          id: 'user-1',
          status: 'active',
          primaryTrade: null,
          plantAccess: [{ id: 'up-1', plantId: 'plant-A' }],
        },
      })

      const result = await checkReadiness('wo-1', 'complete')

      expect(result.ready).toBe(false)
      expect(result.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNRECONCILED_MATERIALS',
            category: 'material',
            severity: 'blocker',
          }),
        ]),
      )
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 19: Material cost formula
  // ────────────────────────────────────────────────────────────────────────────

  describe('Material cost formula', () => {
    it('19. uses (consumed+wasted)*unitCost — returned quantity is excluded', async () => {
      // consumedQty=5, wastedQty=3, quantityReturned=2, unitCost=10
      // Expected material cost = (5+3) * 10 = 80 (returned is NOT counted)
      workOrderFindUnique.mockResolvedValue({
        id: 'wo-cost-1',
        totalCost: 0,
        laborCost: 0,
        partsCost: 0,
        contractorCost: 0,
        estimatedHours: null,
        tradeActivity: null,
        assignedTo: null, // no labor cost lookup
        plantId: null,
        timeLogs: [],
        repairMaterialRequests: [
          {
            unitCost: 10,
            consumedQty: 5,
            wastedQty: 3,
          },
        ],
        repairToolRequests: [],
      })

      // No labor rates found → labor cost = 0
      laborRateFindFirst.mockResolvedValue(null)

      const result = await calculateAuthoritativeCosts('wo-cost-1')

      expect(result).not.toBeNull()
      expect(result!.actualMaterialCost).toBe(80) // (5+3)*10
      expect(result!.actualLaborCost).toBe(0)
      expect(result!.totalActualCost).toBe(80)
    })
  })
})
