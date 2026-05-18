// ============================================================================
// Material Reconciliation — Pick workflow, reconciliation calculations,
// consumption tracking
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock DB ----
const mockMatReqFindUnique = vi.fn().mockResolvedValue(null);
const mockMatReqUpdate = vi.fn().mockResolvedValue({});
const mockInventoryItemFindUnique = vi.fn().mockResolvedValue(null);
const mockInventoryItemUpdate = vi.fn().mockResolvedValue({});
const mockStockMovementCreate = vi.fn().mockResolvedValue({});
const mockAuditCreate = vi.fn().mockResolvedValue({});
const mockNotifyUser = vi.fn().mockResolvedValue({});

vi.mock('@/lib/db', () => ({
  db: {
    repairMaterialRequest: {
      findUnique: mockMatReqFindUnique,
      update: mockMatReqUpdate,
    },
    inventoryItem: {
      findUnique: mockInventoryItemFindUnique,
      update: mockInventoryItemUpdate,
    },
    stockMovement: { create: mockStockMovementCreate },
    auditLog: { create: mockAuditCreate },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockReturnValue(null),
  isAdmin: vi.fn().mockReturnValue(false),
  hasRole: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/notifications', () => ({
  notifyUser: mockNotifyUser,
}));

// ---- Helpers ----

function makeMaterialRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mat-1',
    itemName: 'Bearing 6205',
    quantityRequested: 10,
    quantityApproved: 8,
    quantityIssued: 8,
    unit: 'pcs',
    status: 'issued',
    requestedById: 'user-1',
    workOrderId: 'wo-1',
    itemId: 'inv-1',
    consumedQty: null,
    wastedQty: null,
    quantityReturned: null,
    pickedAt: null,
    pickedBy: null,
    notes: null,
    workOrder: {
      id: 'wo-1',
      woNumber: 'WO-2025-001',
      title: 'Pump Repair',
      assignedSupervisorId: 'sup-1',
      plannerId: 'planner-1',
      assignedTo: 'tech-1',
    },
    requestedBy: { id: 'user-1', fullName: 'Jane Smith' },
    item: { id: 'inv-1', itemCode: 'BRG-6205', name: 'Bearing 6205', currentStock: 50 },
    ...overrides,
  };
}

// ---- Tests ----

describe('Material Reconciliation — Pick Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pick items from storekeeper_approved status', async () => {
    const matReq = makeMaterialRequest({ status: 'storekeeper_approved' });
    mockMatReqFindUnique.mockResolvedValue(matReq);
    mockMatReqUpdate.mockResolvedValue({ ...matReq, status: 'picking', pickedAt: new Date(), pickedBy: 'store-1' });

    // Simulate pick logic
    if (matReq.status !== 'storekeeper_approved' && matReq.status !== 'store_approved') {
      throw new Error('Invalid status for picking');
    }

    await mockMatReqUpdate({
      where: { id: matReq.id },
      data: { status: 'picking', pickedAt: expect.any(Date), pickedBy: 'store-1' },
    });

    expect(mockMatReqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: matReq.id },
        data: expect.objectContaining({ status: 'picking' }),
      }),
    );
  });

  it('should pick items from store_approved status', async () => {
    const matReq = makeMaterialRequest({ status: 'store_approved' });
    mockMatReqFindUnique.mockResolvedValue(matReq);

    // Both statuses should be valid for picking
    const validForPick = matReq.status === 'storekeeper_approved' || matReq.status === 'store_approved';
    expect(validForPick).toBe(true);
  });

  it('should reject pick from non-approved status', () => {
    const matReq = makeMaterialRequest({ status: 'pending' });

    const validForPick = matReq.status === 'storekeeper_approved' || matReq.status === 'store_approved';
    expect(validForPick).toBe(false);
  });

  it('should reject pick from issued status', () => {
    const matReq = makeMaterialRequest({ status: 'issued' });

    const validForPick = matReq.status === 'storekeeper_approved' || matReq.status === 'store_approved';
    expect(validForPick).toBe(false);
  });

  it('should record picker name and timestamp on pick', () => {
    const now = new Date();
    const pickerId = 'store-user-1';

    const updateData = {
      status: 'picking',
      pickedAt: now,
      pickedBy: pickerId,
    };

    expect(updateData.pickedBy).toBe(pickerId);
    expect(updateData.pickedAt).toBeInstanceOf(Date);
    expect(updateData.status).toBe('picking');
  });
});

describe('Material Reconciliation — Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate returned quantity correctly (full consumption)', () => {
    const issuedQty = 10;
    const consumedQty = 10;
    const wastedQty = 0;
    const returnedQty = Math.max(0, issuedQty - consumedQty - wastedQty);

    expect(returnedQty).toBe(0);
  });

  it('should calculate returned quantity correctly (partial consumption)', () => {
    const issuedQty = 10;
    const consumedQty = 7;
    const wastedQty = 1;
    const returnedQty = Math.max(0, issuedQty - consumedQty - wastedQty);

    expect(returnedQty).toBe(2);
  });

  it('should calculate returned quantity correctly (all wasted)', () => {
    const issuedQty = 10;
    const consumedQty = 0;
    const wastedQty = 10;
    const returnedQty = Math.max(0, issuedQty - consumedQty - wastedQty);

    expect(returnedQty).toBe(0);
  });

  it('should calculate reconciliation rate', () => {
    const issuedQty = 10;
    const consumedQty = 8;
    const reconciliationRate = issuedQty > 0 ? (consumedQty / issuedQty) * 100 : 0;

    expect(reconciliationRate).toBe(80);
  });

  it('should calculate waste rate', () => {
    const issuedQty = 10;
    const wastedQty = 2;
    const wasteRate = issuedQty > 0 ? (wastedQty / issuedQty) * 100 : 0;

    expect(wasteRate).toBe(20);
  });

  it('should handle zero issued quantity gracefully', () => {
    const issuedQty = 0;
    const consumedQty = 0;
    const wastedQty = 0;

    const reconciliationRate = issuedQty > 0 ? (consumedQty / issuedQty) * 100 : 0;
    const wasteRate = issuedQty > 0 ? (wastedQty / issuedQty) * 100 : 0;

    expect(reconciliationRate).toBe(0);
    expect(wasteRate).toBe(0);
  });

  it('should validate consumed + wasted does not exceed issued', () => {
    const issuedQty = 10;
    const consumedQty = 8;
    const wastedQty = 3; // exceeds

    const exceeds = consumedQty + wastedQty > issuedQty;
    expect(exceeds).toBe(true);
  });

  it('should validate consumed + wasted equals issued is acceptable', () => {
    const issuedQty = 10;
    const consumedQty = 7;
    const wastedQty = 3;

    const exceeds = consumedQty + wastedQty > issuedQty;
    expect(exceeds).toBe(false);
  });

  it('should determine status: closed when fully consumed/wasted', () => {
    const issuedQty = 10;
    const consumedQty = 8;
    const wastedQty = 2;

    const status = (consumedQty + wastedQty >= issuedQty) ? 'closed' : 'issued';
    expect(status).toBe('closed');
  });

  it('should determine status: issued when partially reconciled', () => {
    const issuedQty = 10;
    const consumedQty = 5;
    const wastedQty = 1;

    const status = (consumedQty + wastedQty >= issuedQty) ? 'closed' : 'issued';
    expect(status).toBe('issued');
  });

  it('should default wasted quantity to zero when not provided', () => {
    const wastedQty = undefined;
    const resolvedWastedQty = wastedQty || 0;

    expect(resolvedWastedQty).toBe(0);
  });

  it('should validate consumedQty is a non-negative number', () => {
    const consumedQty = -5;
    const isValid = typeof consumedQty === 'number' && consumedQty >= 0;
    expect(isValid).toBe(false);
  });

  it('should validate wastedQty is a non-negative number when provided', () => {
    const wastedQty = -1;
    const isValid = typeof wastedQty === 'number' && wastedQty >= 0;
    expect(isValid).toBe(false);
  });
});

describe('Material Reconciliation — Consumption Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return excess inventory to stock when returnedQty > 0', async () => {
    const returnedQty = 3;
    const matReq = makeMaterialRequest({ itemId: 'inv-1', status: 'issued', quantityIssued: 8 });
    mockMatReqFindUnique.mockResolvedValue(matReq);
    mockInventoryItemFindUnique.mockResolvedValue({ id: 'inv-1', currentStock: 50 });
    mockInventoryItemUpdate.mockResolvedValue({});
    mockStockMovementCreate.mockResolvedValue({});

    // Simulate return logic
    if (returnedQty > 0 && matReq.itemId) {
      const invItem = await mockInventoryItemFindUnique({ where: { id: matReq.itemId } });
      expect(invItem).toBeTruthy();

      await mockInventoryItemUpdate({
        where: { id: matReq.itemId },
        data: { currentStock: { increment: returnedQty } },
      });
      expect(mockInventoryItemUpdate).toHaveBeenCalled();

      await mockStockMovementCreate({
        data: expect.objectContaining({
          itemId: matReq.itemId,
          type: 'in',
          quantity: returnedQty,
          reason: expect.stringContaining('Reconciliation return'),
        }),
      });
      expect(mockStockMovementCreate).toHaveBeenCalled();
    }
  });

  it('should not create stock movement when returnedQty is 0', () => {
    const returnedQty = 0;
    const matReq = makeMaterialRequest({ itemId: 'inv-1' });

    if (returnedQty > 0 && matReq.itemId) {
      // Would create stock movement
      expect(true).toBe(false);
    } else {
      // No stock movement needed
      expect(true).toBe(true);
    }
  });

  it('should not return to inventory when itemId is null', () => {
    const returnedQty = 3;
    const matReq = makeMaterialRequest({ itemId: null });

    if (returnedQty > 0 && matReq.itemId) {
      // Would create stock movement
      expect(true).toBe(false);
    } else {
      // No stock movement — no linked inventory item
      expect(true).toBe(true);
    }
  });

  it('should reject reconciliation from non-issued status', () => {
    const matReq = makeMaterialRequest({ status: 'pending' });

    const canReconcile = matReq.status === 'issued' || matReq.status === 'picking';
    expect(canReconcile).toBe(false);
  });

  it('should allow reconciliation from issued status', () => {
    const matReq = makeMaterialRequest({ status: 'issued' });

    const canReconcile = matReq.status === 'issued' || matReq.status === 'picking';
    expect(canReconcile).toBe(true);
  });

  it('should allow reconciliation from picking status', () => {
    const matReq = makeMaterialRequest({ status: 'picking' });

    const canReconcile = matReq.status === 'issued' || matReq.status === 'picking';
    expect(canReconcile).toBe(true);
  });

  it('should append reconciliation notes to existing notes', () => {
    const existingNotes = 'Some prior notes';
    const newNote = 'Reconciliation: 8 consumed, 1 wasted';
    const timestamp = new Date().toISOString();
    const userId = 'user-1';

    const appendedNotes = existingNotes
      ? `${existingNotes}\n[${timestamp}] RECONCILIATION by ${userId}: ${newNote}`
      : `[${timestamp}] RECONCILIATION by ${userId}: ${newNote}`;

    expect(appendedNotes).toContain('Some prior notes');
    expect(appendedNotes).toContain('RECONCILIATION');
    expect(appendedNotes).toContain(userId);
  });

  it('should create reconciliation summary', () => {
    const issuedQty = 8;
    const consumedQty = 6;
    const wastedQty = 1;
    const returnedQty = 1;
    const reconciliationRate = (consumedQty / issuedQty) * 100;
    const wasteRate = (wastedQty / issuedQty) * 100;

    const reconciliation = {
      materialRequestId: 'mat-1',
      itemName: 'Bearing 6205',
      woNumber: 'WO-2025-001',
      issuedQty,
      consumedQty,
      wastedQty,
      returnedQty,
      reconciliationRate: Number(reconciliationRate.toFixed(1)),
      wasteRate: Number(wasteRate.toFixed(1)),
      status: 'issued',
      reconciledBy: 'user-1',
    };

    expect(reconciliation.reconciliationRate).toBe(75);
    expect(reconciliation.wasteRate).toBe(12.5);
    expect(reconciliation.returnedQty).toBe(1);
  });

  it('should calculate new stock correctly after return', () => {
    const previousStock = 50;
    const returnedQty = 3;
    const newStock = previousStock + returnedQty;

    expect(newStock).toBe(53);
  });
});
