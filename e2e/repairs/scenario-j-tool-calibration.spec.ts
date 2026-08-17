/**
 * Scenario J — Tool Calibration (UAT-06)
 *
 * Tests tool calibration enforcement in the tool issue flow.
 * The calibration check runs inside `atomicIssueTools` (called from
 * the repair tool request 'issue' action) and blocks issuance of
 * tools with expired/overdue/failed calibration.
 *
 * IMPORTANT CONSTRAINT: There is no public API to create
 * `ToolCalibrationRequirement` records. The seed script does not
 * create calibration data. Therefore:
 *   - J1 tests the structural behavior of the tool request issue
 *     flow when a tool item references a non-existent tool (no
 *     calibration requirement → not blocked).
 *   - J2 tests successful issuance of tools without calibration
 *     requirements.
 *   - J3 tests that technicians cannot create tools (permission)
 *     and that the tool checkout API is permission-gated.
 *
 * The actual calibration BLOCKING logic is tested in unit tests
 * (toolCalibration.service.test.ts) since the E2E environment lacks
 * an API to create calibration requirements.
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
  apiCall,
  expectFailure,
} from './helpers/api';

test.describe('Scenario J: Tool Calibration', () => {
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;

  test.beforeAll(async () => {
    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');
  });

  // ────────────────────────────────────────────────────────────────────
  // J0: Create WO and start it for tool calibration tests
  // ────────────────────────────────────────────────────────────────────
  test('J0: Create and start WO for tool calibration tests', async () => {
    const requesterToken = await getToken('requester');
    const supervisorToken = await getToken('supervisor');
    const plannerToken = await getToken('planner');
    const techToken = await getToken('tech_single');

    const mr = await createMR(requesterToken, {
      title: 'UAT-ToolCal-Pump-Repair',
      description: 'Pump repair requiring calibrated measuring tools.',
      assetId,
      priority: 'high',
      plantId,
    });

    await approveMR(supervisorToken, mr.id);
    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: techSingleUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'high',
    });
    woId = wo.id;
    expect(woId).toBeTruthy();

    await assignWO(plannerToken, woId, { assignedTo: techSingleUserId });
    await startWO(techToken, woId);

    const fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ────────────────────────────────────────────────────────────────────
  // J1: Tool request issue for tool WITHOUT calibration requirement
  //     (named tool, no toolId → no calibration check → succeeds)
  // ────────────────────────────────────────────────────────────────────
  test('J1: Tool issue succeeds when no calibration requirement exists', async () => {
    const techToken = await getToken('tech_single');
    const supervisorToken = await getToken('supervisor');
    const storekeeperToken = await getToken('storekeeper');

    // Step 1: Create a tool request with a named tool (no toolId)
    const { status: trStatus, data: trData } = await apiCall(
      techToken, 'POST', '/api/repairs/tool-requests', {
        workOrderId: woId,
        reason: 'Need a dial indicator for shaft alignment',
        urgency: 'normal',
        items: [{
          toolName: `UAT Calibrated Dial Indicator ${Date.now().toString(36)}`,
          quantityRequested: 1,
        }],
      },
    );
    expect(trStatus).toBe(201);
    expect(trData.data.id).toBeTruthy();
    const toolRequestId = trData.data.id;
    const itemId = trData.data.items[0].id;
    expect(itemId).toBeTruthy();

    // Step 2: Supervisor approves
    const { status: saStatus, data: saData } = await apiCall(
      supervisorToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
        action: 'supervisor_approve',
      },
    );
    expect(saStatus).toBe(200);
    expect(saData.data.status).toBe('supervisor_approved');

    // Step 3: Storekeeper approves
    const { status: skStatus, data: skData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
        action: 'storekeeper_approve',
      },
    );
    expect(skStatus).toBe(200);
    expect(skData.data.status).toBe('storekeeper_approved');

    // Step 4: Issue the tool
    // Since the item has NO toolId, no calibration check runs.
    // The issue should succeed (the tool is "virtual" / named-only).
    const { status: issueStatus, data: issueData } = await apiCall(
      storekeeperToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
        action: 'issue',
        issuedItems: [{
          itemId,
          quantityIssued: 1,
        }],
      },
    );
    // The issue should succeed for items without a linked tool
    // (no calibration requirement to check)
    expect(issueStatus).toBe(200);
    expect(issueData.success).toBe(true);

    // Server-state: tool request should be issued
    const { data: fetchedTR } = await apiCall(
      techToken, 'GET', `/api/repairs/tool-requests/${toolRequestId}`,
    );
    expect(fetchedTR.data.status).toBe('issued');
  });

  // ────────────────────────────────────────────────────────────────────
  // J2: Valid tool creation is permission-gated
  //     (only tools_shop_attendant and admin can create tools)
  // ────────────────────────────────────────────────────────────────────
  test('J2: Tool creation requires proper permissions', async () => {
    const techToken = await getToken('tech_single');
    const supervisorToken = await getToken('supervisor');

    // Technician tries to create a tool → 403
    const { status: techStatus, data: techData } = await expectFailure(
      techToken, 'POST', '/api/tools', {
        name: 'UAT Unauthorized Tool',
        category: 'measurement',
        condition: 'good',
      },
    );
    expect(techStatus).toBe(403);
    expect(techData.success).toBe(false);

    // Supervisor also cannot create tools (no tools.create permission)
    const { status: supStatus, data: supData } = await expectFailure(
      supervisorToken, 'POST', '/api/tools', {
        name: 'UAT Supervisor Tool',
        category: 'measurement',
        condition: 'good',
      },
    );
    expect(supStatus).toBe(403);
    expect(supData.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // J3: Technician cannot perform emergency override
  //     (no API endpoint exists — service-level function only,
  //      but we verify the technician can't access calibration management)
  // ────────────────────────────────────────────────────────────────────
  test('J3: Technician cannot manage calibration records', async () => {
    const techToken = await getToken('tech_single');

    // Attempt to create a calibration record → 403 (no calibration.create)
    const { status, data } = await expectFailure(
      techToken, 'POST', '/api/calibrations', {
        instrumentName: 'UAT Test Instrument',
        status: 'calibrated',
      },
    );
    expect(status).toBe(403);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // J4: Tool checkout API enforces permissions
  // ────────────────────────────────────────────────────────────────────
  test('J4: Tool checkout requires tools.checkout permission', async () => {
    const techToken = await getToken('tech_single');

    // Technician has tools.checkout permission per seed-permissions-only.ts
    // Attempt checkout with a fake tool ID — should get 404 (tool not found)
    // not 403 (permission denied), confirming permission check passes
    const { status, data } = await expectFailure(
      techToken, 'POST', '/api/tools/nonexistent-tool-id/checkout', {
        assignedToId: techSingleUserId,
      },
    );
    // Should be 404 (tool not found), not 403 (permission denied)
    // This confirms the technician HAS tools.checkout permission
    expect(status).toBe(404);
    expect(data.success).toBe(false);

    // A user WITHOUT tools.checkout permission would get 403
    // The requester user has no tools.checkout
    const requesterToken = await getToken('requester');
    const { status: reqStatus, data: reqData } = await expectFailure(
      requesterToken, 'POST', '/api/tools/nonexistent-tool-id/checkout', {
        assignedToId: techSingleUserId,
      },
    );
    expect(reqStatus).toBe(403);
    expect(reqData.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // J5: Tool request issue validates status progression
  //     (cannot issue from 'pending' — must be 'storekeeper_approved')
  // ────────────────────────────────────────────────────────────────────
  test('J5: Tool issue blocked when status is not storekeeper_approved', async () => {
    const techToken = await getToken('tech_single');

    // Create a new tool request (will be in 'pending' status)
    const { status: trStatus, data: trData } = await apiCall(
      techToken, 'POST', '/api/repairs/tool-requests', {
        workOrderId: woId,
        reason: 'Need a feeler gauge',
        urgency: 'normal',
        items: [{
          toolName: `UAT Feeler Gauge ${Date.now().toString(36)}`,
          quantityRequested: 1,
        }],
      },
    );
    expect(trStatus).toBe(201);
    const newToolRequestId = trData.data.id;

    // Attempt to issue directly (status is 'pending', not 'storekeeper_approved')
    const { status: issueStatus, data: issueData } = await expectFailure(
      techToken, 'POST', `/api/repairs/tool-requests/${newToolRequestId}`, {
        action: 'issue',
        issuedItems: [{
          itemId: trData.data.items[0].id,
          quantityIssued: 1,
        }],
      },
    );
    // Should fail — status must be 'storekeeper_approved'
    expect(issueStatus).toBe(400);
    expect(issueData.success).toBe(false);
    expect(issueData.error).toContain('storekeeper_approved');
  });
});
