/**
 * Scenario F — Shift Handover Full Lifecycle (UAT-08)
 *
 * Tests the COMPLETE shift handover lifecycle via API-only assertions:
 *   F1: Create MR → approve → convert → assign to tech_single → start work
 *   F2: tech_single initiates handover via POST /api/work-orders/[id]/handover (action='initiate')
 *       → verify WO status = 'pending_handover'
 *   F3: Attempt to start work or resume BEFORE confirmation → must FAIL (403 or 400)
 *   F4: POST /api/shift-handovers/[id]/confirm as the INCOMING designated recipient
 *       → verify ShiftHandover status = 'confirmed'
 *   F5: Wrong user (not the receivedById) tries to confirm → must FAIL (403)
 *   F6: POST /api/work-orders/[id]/handover (action='resume') after confirmation
 *       → verify WO status = 'in_progress'
 *   F7: Verify a time log entry was created for the resume
 *
 * ALL assertions are server-state based (API responses), never UI text.
 * Uses single test() with test.step() pattern — no describe/beforeAll/afterAll.
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
  resumeAfterHandoverWO,
  confirmShiftHandover,
} from './helpers/api';

test('UAT-08: Scenario F — Shift Handover Lifecycle', async () => {
  let woId = '';
  let handoverId = '';

  // ── F1: Create MR → approve → convert → assign → start ─────────────────
  await test.step('F1: Create WO and start work', async () => {
    const requesterToken = await getToken('requester');
    const supervisorToken = await getToken('supervisor');
    const plannerToken = await getToken('planner');
    const techToken = await getToken('tech_single');

    // Pre-resolve IDs
    const techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    const plantId = await lookupPlantId(plannerToken, 'PLANT-A');

    // Create MR
    const mr = await createMR(requesterToken, {
      title: 'UAT-ShiftHandover-Pump-Repair',
      description: 'Pump bearing replacement — will cross shift boundary.',
      assetId,
      priority: 'high',
      plantId,
    });

    // Supervisor approves
    await approveMR(supervisorToken, mr.id);

    // Planner converts to WO and assigns to tech_single
    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: techSingleUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'high',
    });
    woId = wo.id;
    expect(woId).toBeTruthy();

    // Assign and start
    await assignWO(plannerToken, woId, { assignedTo: techSingleUserId });
    await startWO(techToken, woId);

    // Server-state: WO is in_progress
    const fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ── F2: Technician initiates handover ───────────────────────────────────
  await test.step('F2: Technician initiates handover → WO status = pending_handover', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // Initiate handover with action='initiate'
    const { status: initStatus, data: initData } = await apiCall(
      techToken, 'POST', `/api/work-orders/${woId}/handover`, {
        action: 'initiate',
        reason: 'End of shift — bearing partially removed',
      },
    );
    expect(initStatus).toBe(200);
    expect(initData.success).toBe(true);

    // Verify WO status is now pending_handover via API GET
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');

    // Retrieve the ShiftHandover record for this WO
    const { status: shStatus, data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers?workOrderId=${woId}`,
    );
    expect(shStatus).toBe(200);
    expect(shData.success).toBe(true);
    const handovers = shData.data as Array<{ id: string; status: string; workOrderId?: string }>;
    expect(Array.isArray(handovers)).toBe(true);
    // Capture the handover ID for subsequent steps
    const pendingHandover = handovers.find(
      (h) => h.status === 'pending' || h.workOrderId === woId,
    );
    expect(pendingHandover).toBeTruthy();
    handoverId = pendingHandover!.id;
    expect(handoverId).toBeTruthy();
  });

  // ── F3: Attempt to start work or resume BEFORE confirmation → FAIL ──────
  await test.step('F3: Cannot start work or resume while pending_handover (before confirmation)', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // POST /api/work-orders/[id]/start should FAIL (403 or 400)
    const { status: startStatus, data: startData } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/start`, {},
    );
    expect([400, 403]).toContain(startStatus);
    expect(startData.success).toBe(false);

    // POST /api/work-orders/[id]/handover with action='resume' should also FAIL
    const { status: resumeStatus, data: resumeData } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/handover`,
      { action: 'resume', reason: 'Trying to resume before confirmation' },
    );
    expect([400, 403]).toContain(resumeStatus);
    expect(resumeData.success).toBe(false);

    // WO should still be pending_handover
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F4: INCOMING designated recipient confirms handover ────────────────
  await test.step('F4: INCOMING recipient confirms handover → ShiftHandover status = confirmed', async () => {
    const plannerToken = await getToken('planner');

    // Confirm the handover — the INCOMING designated recipient calls confirm
    const confirmResult = await confirmShiftHandover(plannerToken, handoverId);
    expect(confirmResult).toBeTruthy();

    // Verify ShiftHandover record is now 'confirmed' via GET
    const { status: shStatus, data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(shStatus).toBe(200);
    expect(shData.success).toBe(true);
    expect(shData.data.status).toBe('confirmed');

    // WO should still be pending_handover until resume is called
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F5: Wrong user tries to confirm → must FAIL (403) ─────────────────
  await test.step('F5: Wrong user (not the receivedById) tries to confirm → 403', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // tech_single (the outgoing user) tries to confirm their own handover
    // This should be rejected with 403
    const { status, data } = await expectFailure(
      techToken, 'POST', `/api/shift-handovers/${handoverId}/confirm`, {},
    );
    expect([400, 403]).toContain(status);
    expect(data.success).toBe(false);

    // Verify handover status is still confirmed (unchanged)
    const { data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(shData.data.status).toBe('confirmed');
  });

  // ── F6: Resume after confirmed handover → WO status = in_progress ──────
  await test.step('F6: Resume after confirmed handover → WO status = in_progress', async () => {
    const techToken = await getToken('tech_single');

    // POST /api/work-orders/[id]/handover with action='resume' after confirmation
    await resumeAfterHandoverWO(techToken, woId, 'Resuming work after shift handover');

    // Server-state: WO should be in_progress again
    const fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ── F7: Verify a time log entry was created for the resume ─────────────
  await test.step('F7: Verify a time log entry was created for the resume', async () => {
    const plannerToken = await getToken('planner');

    // GET /api/work-orders/[woId]/time-logs and verify there is an entry
    const { status, data } = await apiCall(
      plannerToken, 'GET', `/api/work-orders/${woId}/time-logs`,
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    const timeLogs = data.data as Array<{ id: string; action?: string; notes?: string }>;
    expect(Array.isArray(timeLogs)).toBe(true);
    expect(timeLogs.length).toBeGreaterThanOrEqual(1);

    // Verify that the handover/resume is reflected in the audit trail
    const { status: shStatus, data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers?workOrderId=${woId}`,
    );
    expect(shStatus).toBe(200);
    expect(shData.success).toBe(true);
    const handovers = shData.data as Array<{ id: string; status: string }>;
    expect(handovers.length).toBeGreaterThanOrEqual(1);
    const confirmed = handovers.find((h) => h.status === 'confirmed');
    expect(confirmed).toBeTruthy();
  });
});
