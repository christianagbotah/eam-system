/**
 * Scenario J — Tool Calibration Enforcement (UAT-06)
 *
 * Tests the real calibration check that runs inside `atomicIssueTools`
 * when the storekeeper issues a tool request. Three seed tools cover:
 *   - UAT-CAL-VALID   : calibrationStatus='calibrated', nextCalibrationDue in future  → ALLOW
 *   - UAT-CAL-EXPIRED : calibrationStatus='expired',   nextCalibrationDue in past    → BLOCK
 *   - UAT-CAL-FAILED  : calibrationStatus='failed'                                 → BLOCK
 *
 * The calibration enforcement uses a soft-block pattern: the issue action returns
 * 200 but blocked items are skipped (no ToolTransaction, no quantityIssued).
 * Warnings in the response contain 'calibration' / 'BLOCKED'.
 */
import { test, expect } from '@playwright/test';
import {
  getToken,
  createMR,
  approveMR,
  convertMR,
  assignWO,
  startWO,
  getWO,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  lookupToolId,
  apiCall,
  expectFailure,
} from './helpers/api';

test('UAT-06: Scenario J — Tool Calibration Enforcement', async ({ browser }) => {
  // ── Resolve prerequisite IDs ──────────────────────────────────────────
  const plannerToken = await getToken('planner');
  const techUserId = await lookupUserByKey(plannerToken, 'tech_single');
  const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
  const plantId = await lookupPlantId(plannerToken, 'PLANT-A');

  // Resolve calibration tool IDs
  const validToolId = await lookupToolId(plannerToken, 'UAT-CAL-VALID');
  const expiredToolId = await lookupToolId(plannerToken, 'UAT-CAL-EXPIRED');
  const failedToolId = await lookupToolId(plannerToken, 'UAT-CAL-FAILED');

  // ── J1: Create and start a WO (prerequisite) ──────────────────────────
  await test.step('J1: Create and start WO for calibration tests', async () => {
    const requesterToken = await getToken('requester');
    const supervisorToken = await getToken('supervisor');
    const techToken = await getToken('tech_single');

    const mr = await createMR(requesterToken, {
      title: 'UAT-ToolCal-Scenario-J',
      description: 'WO for testing tool calibration enforcement.',
      assetId,
      priority: 'high',
      plantId,
    });

    await approveMR(supervisorToken, mr.id);
    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: techUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'high',
    });
    expect(wo.id).toBeTruthy();

    await assignWO(plannerToken, wo.id, { assignedTo: techUserId });
    await startWO(techToken, wo.id);

    const fetched = await getWO(techToken, wo.id);
    expect(fetched.status).toBe('in_progress');
  });

  // Pre-fetch tokens used across steps
  const techToken = await getToken('tech_single');
  const supervisorToken = await getToken('supervisor');
  const storekeeperToken = await getToken('storekeeper');

  /**
   * Helper: create a tool request, get it through approval, and return
   * the request ID + first item ID.
   */
  async function createAndApproveToolRequest(toolId: string, woId: string) {
    // Create tool request with the calibration tool
    const { status: crStatus, data: crData } = await apiCall(
      techToken, 'POST', '/api/repairs/tool-requests', {
        workOrderId: woId,
        reason: `Calibration test for tool ${toolId.slice(0, 8)}`,
        urgency: 'normal',
        items: [{
          toolId,
          toolName: `Cal test ${toolId.slice(0, 8)}`,
          quantityRequested: 1,
        }],
      },
    );
    expect(crStatus).toBe(201);
    expect(crData.success).toBe(true);
    const trId = crData.data.id;
    const itemId = crData.data.items[0].id;
    expect(trId).toBeTruthy();
    expect(itemId).toBeTruthy();

    // Supervisor approves
    const { status: saStatus, data: saData } = await apiCall(
      supervisorToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'supervisor_approve',
      },
    );
    expect(saStatus).toBe(200);
    expect(saData.data.status).toBe('supervisor_approved');

    // Storekeeper approves
    const { status: skStatus, data: skData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'storekeeper_approve',
      },
    );
    expect(skStatus).toBe(200);
    expect(skData.data.status).toBe('storekeeper_approved');

    return { trId, itemId };
  }

  /**
   * Helper: get a WO ID for the current technician (finds an in_progress WO).
   */
  async function getInProgressWoId(): Promise<string> {
    const { status, data } = await apiCall(
      techToken, 'GET', '/api/work-orders?status=in_progress&limit=1',
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    const wos = data.data as Array<{ id: string; status: string }>;
    expect(wos.length).toBeGreaterThanOrEqual(1);
    return wos[0].id;
  }

  /**
   * Helper: get tool transactions for a tool.
   */
  async function getToolTransactions(toolId: string) {
    const { status, data } = await apiCall(
      plannerToken, 'GET', `/api/tools/${toolId}/transactions`,
    );
    expect(status).toBe(200);
    return data;
  }

  // ── J2: VALID calibration — tool issues successfully ───────────────────
  await test.step('J2: VALID calibration — tool issues successfully', async () => {
    const woId = await getInProgressWoId();
    const { trId, itemId } = await createAndApproveToolRequest(validToolId, woId);

    // Issue the tool
    const { status: issueStatus, data: issueData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'issue',
        issuedItems: [{ itemId, quantityIssued: 1 }],
      },
    );
    expect(issueStatus).toBe(200);
    expect(issueData.success).toBe(true);

    // Verify: no calibration warnings for a valid tool
    const warnings = issueData.warnings as string[] | undefined;
    if (warnings) {
      expect(warnings.some(w => w.toLowerCase().includes('blocked'))).toBe(false);
    }

    // Server-state: request status should be 'issued'
    const { data: fetched } = await apiCall(
      techToken, 'GET', `/api/repairs/tool-requests/${trId}`,
    );
    expect(fetched.data.status).toBe('issued');

    // Server-state: the item should have quantityIssued > 0
    const issuedItem = fetched.data.items.find((i: any) => i.id === itemId);
    expect(issuedItem).toBeTruthy();
    expect(issuedItem.quantityIssued).toBeGreaterThanOrEqual(1);

    // Server-state: ToolTransaction should exist for this tool
    const txData = await getToolTransactions(validToolId);
    const checkouts = (txData.data as Array<{ type: string }>).filter(
      (tx) => tx.type === 'checkout',
    );
    expect(checkouts.length).toBeGreaterThanOrEqual(1);
  });

  // ── J3: EXPIRED calibration — item blocked with calibration warning ────
  await test.step('J3: EXPIRED calibration — item blocked', async () => {
    const woId = await getInProgressWoId();
    const { trId, itemId } = await createAndApproveToolRequest(expiredToolId, woId);

    // Issue the tool
    const { status: issueStatus, data: issueData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'issue',
        issuedItems: [{ itemId, quantityIssued: 1 }],
      },
    );

    // The issue action returns 200 (soft-block pattern), but the item is skipped.
    expect(issueStatus).toBe(200);
    expect(issueData.success).toBe(true);

    // Verify: warnings must contain 'calibration' and 'BLOCKED'
    const warnings = issueData.warnings as string[];
    expect(warnings).toBeTruthy();
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    const blockedWarning = warnings.find(
      (w) => w.toLowerCase().includes('calibration') || w.toLowerCase().includes('blocked'),
    );
    expect(blockedWarning).toBeTruthy();

    // Server-state: request status remains 'storekeeper_approved' (all items blocked)
    const { data: fetched } = await apiCall(
      techToken, 'GET', `/api/repairs/tool-requests/${trId}`,
    );
    expect(fetched.data.status).toBe('storekeeper_approved');

    // Server-state: the expired item should NOT have been issued
    const blockedItem = fetched.data.items.find((i: any) => i.id === itemId);
    expect(blockedItem).toBeTruthy();
    expect(blockedItem.quantityIssued ?? 0).toBe(0);
    expect(blockedItem.availabilityStatus).toBe('unavailable');
    expect(blockedItem.issueNotes).toBeTruthy();
    expect(blockedItem.issueNotes.toLowerCase()).toContain('calibration');

    // Server-state: no ToolTransaction for the expired tool
    const txData = await getToolTransactions(expiredToolId);
    const txList = txData.data as Array<{ type: string }>[];
    // The transactions array should be empty — no checkout happened
    expect(txData.pagination.total).toBe(0);
  });

  // ── J4: FAILED calibration — item blocked with calibration warning ─────
  await test.step('J4: FAILED calibration — item blocked', async () => {
    const woId = await getInProgressWoId();
    const { trId, itemId } = await createAndApproveToolRequest(failedToolId, woId);

    // Issue the tool
    const { status: issueStatus, data: issueData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'issue',
        issuedItems: [{ itemId, quantityIssued: 1 }],
      },
    );

    // Same soft-block pattern as expired
    expect(issueStatus).toBe(200);
    expect(issueData.success).toBe(true);

    // Verify: warnings contain calibration block
    const warnings = issueData.warnings as string[];
    expect(warnings).toBeTruthy();
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    const blockedWarning = warnings.find(
      (w) => w.toLowerCase().includes('calibration') || w.toLowerCase().includes('blocked'),
    );
    expect(blockedWarning).toBeTruthy();

    // Server-state: the failed item should NOT have been issued
    const { data: fetched } = await apiCall(
      techToken, 'GET', `/api/repairs/tool-requests/${trId}`,
    );
    expect(fetched.data.status).toBe('storekeeper_approved');

    const blockedItem = fetched.data.items.find((i: any) => i.id === itemId);
    expect(blockedItem).toBeTruthy();
    expect(blockedItem.quantityIssued ?? 0).toBe(0);
    expect(blockedItem.availabilityStatus).toBe('unavailable');
    expect(blockedItem.issueNotes).toBeTruthy();
    expect(blockedItem.issueNotes.toLowerCase()).toContain('calibration');

    // Server-state: no ToolTransaction for the failed tool
    const txData = await getToolTransactions(failedToolId);
    expect(txData.pagination.total).toBe(0);
  });

  // ── J5: EMERGENCY OVERRIDE — technician cannot bypass calibration ─────
  await test.step('J5: Emergency override — technician cannot bypass calibration', async () => {
    const woId = await getInProgressWoId();

    // Create a tool request for the expired tool and get it approved
    const { trId, itemId } = await createAndApproveToolRequest(expiredToolId, woId);

    // Technician attempts to issue — the 'issue' action is restricted to
    // storekeeper/inventory roles, so this must return 403.
    const { status: issueStatus, data: issueData } = await expectFailure(
      techToken, 'POST', `/api/repairs/tool-requests/${trId}`, {
        action: 'issue',
        issuedItems: [{ itemId, quantityIssued: 1 }],
      },
    );
    expect(issueStatus).toBe(403);
    expect(issueData.success).toBe(false);

    // Server-state: request still in storekeeper_approved (issue was rejected)
    const { data: fetched } = await apiCall(
      techToken, 'GET', `/api/repairs/tool-requests/${trId}`,
    );
    expect(fetched.data.status).toBe('storekeeper_approved');
  });
});
