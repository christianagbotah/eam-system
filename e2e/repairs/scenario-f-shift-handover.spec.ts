/**
 * Scenario F — Shift Handover Lifecycle (UAT-08)
 *
 * Tests the NEW atomic handover flow where `initiateHandover`:
 *   1. Transitions WO to pending_handover
 *   2. Closes active timer
 *   3. Creates a ShiftHandover record with status: 'pending_confirmation'
 *
 * F1:  Create MR → supervisor approve → planner convert → assign tech_single → start work
 * F2:  tech_single initiates handover → verify WO status, ShiftHandover record, handedOverById
 * F3:  Attempt to start work while pending_handover → must be blocked (400/422)
 * F4:  Attempt resume (action=resume) WITHOUT a confirmed handover → must fail
 * F5:  Set the ShiftHandover's receivedById to tech_assistant's userId
 * F6:  tech_assistant confirms the handover → status becomes 'confirmed'
 * F7:  tech_assistant resumes work → WO status = in_progress
 * F8:  Original tech_single cannot self-resume (already handed over)
 * F9:  Verify audit trail exists
 * F10: Verify ShiftHandover record has confirmed status and proper timestamps
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
  initiateHandoverWO,
  resumeAfterHandoverWO,
} from './helpers/api';

test('UAT-08: Scenario F — Shift Handover Lifecycle', async ({ page, browser }) => {
  let woId = '';
  let techSingleUserId = '';
  let techAssistantUserId = '';
  let handoverId = '';

  // ── F1: Create MR → approve → convert → assign → start ─────────────────
  await test.step('F1: Create WO and start work', async () => {
    const requesterToken = await getToken('requester');
    const supervisorToken = await getToken('supervisor');
    const plannerToken = await getToken('planner');
    const techToken = await getToken('tech_single');

    // Pre-resolve IDs
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    techAssistantUserId = await lookupUserByKey(plannerToken, 'tech_assistant');
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

  // ── F2: tech_single initiates handover → verify atomic results ───────────
  await test.step('F2: tech_single initiates handover — verify WO + ShiftHandover record', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // Initiate handover
    const result = await initiateHandoverWO(techToken, woId, 'End of shift — bearing partially removed');
    expect(result).toBeTruthy();

    // Verify WO status is now pending_handover via API GET
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');

    // Verify ShiftHandover record was created atomically
    const { status, data } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers?workOrderId=${woId}`,
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    const handovers = data.data as Array<Record<string, unknown>>;
    expect(Array.isArray(handovers)).toBe(true);
    expect(handovers.length).toBeGreaterThanOrEqual(1);

    // Find the pending_confirmation handover
    const pending = handovers.find(
      (h) => h.status === 'pending_confirmation',
    );
    expect(pending).toBeTruthy();
    expect(pending!.handedOverById).toBe(techSingleUserId);
    handoverId = pending!.id as string;
    expect(handoverId).toBeTruthy();
  });

  // ── F3: Attempt to start work while pending_handover → blocked ──────────
  await test.step('F3: Cannot start work while pending_handover', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // POST /api/work-orders/[id]/start should FAIL (status >= 400)
    const { status } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/start`, {},
    );
    expect(status).toBeGreaterThanOrEqual(400);

    // WO should still be pending_handover
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F4: Attempt resume WITHOUT a confirmed handover → must fail ────────
  await test.step('F4: Attempt resume without confirmed handover — must fail', async () => {
    const techAssistantToken = await getToken('tech_assistant');
    const plannerToken = await getToken('planner');

    // POST /api/work-orders/[id]/handover with action='resume'
    // No confirmed handover exists yet, so this must fail
    const { status, data } = await expectFailure(
      techAssistantToken, 'POST', `/api/work-orders/${woId}/handover`,
      { action: 'resume', reason: 'Taking over from previous shift' },
    );
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);

    // Verify WO is still pending_handover
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F5: Set the ShiftHandover's receivedById to tech_assistant ──────────
  await test.step('F5: Set receivedById on ShiftHandover to tech_assistant', async () => {
    const plannerToken = await getToken('planner');

    const { status, data } = await apiCall(
      plannerToken, 'PUT', `/api/shift-handovers/${handoverId}`,
      { receivedById: techAssistantUserId },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify the update
    const { status: gs, data: gd } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(gs).toBe(200);
    expect(gd.data.receivedById).toBe(techAssistantUserId);
  });

  // ── F6: tech_assistant confirms the handover → status='confirmed' ───────
  await test.step('F6: tech_assistant confirms the handover', async () => {
    const techAssistantToken = await getToken('tech_assistant');

    const { status, data } = await apiCall(
      techAssistantToken, 'PUT', `/api/shift-handovers/${handoverId}`,
      { action: 'confirm' },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify ShiftHandover status is now 'confirmed'
    const { status: gs, data: gd } = await apiCall(
      techAssistantToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(gs).toBe(200);
    expect(gd.data.status).toBe('confirmed');
  });

  // ── F7: tech_assistant resumes work → WO status = in_progress ───────────
  await test.step('F7: tech_assistant resumes work — WO back to in_progress', async () => {
    const techAssistantToken = await getToken('tech_assistant');

    // Use resumeAfterHandoverWO helper
    const result = await resumeAfterHandoverWO(
      techAssistantToken, woId, 'Taking over from previous shift — continuing bearing replacement',
    );
    expect(result).toBeTruthy();

    // WO status should be in_progress
    const fetched = await getWO(techAssistantToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ── F8: Original tech_single cannot self-resume ─────────────────────────
  await test.step('F8: Original tech_single cannot self-resume after handover', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    // The original technician who handed over should NOT be able to resume.
    // The handover is already confirmed and consumed by tech_assistant.
    const { status, data } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/handover`,
      { action: 'resume', reason: 'Attempting to self-resume after handover' },
    );
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);

    // WO should remain in_progress (resume by tech_assistant succeeded in F7)
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ── F9: Verify audit trail exists ───────────────────────────────────────
  await test.step('F9: Verify audit trail exists', async () => {
    const plannerToken = await getToken('planner');

    // Query shift-handovers list for this WO
    const { status, data } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers?workOrderId=${woId}`,
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.kpis).toBeDefined();
    expect(typeof data.kpis.total).toBe('number');
    expect(data.kpis.total).toBeGreaterThanOrEqual(1);

    // Verify the WO is now in_progress (resume succeeded)
    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ── F10: Verify ShiftHandover record has confirmed status + timestamps ──
  await test.step('F10: Verify ShiftHandover confirmed status and timestamps', async () => {
    const plannerToken = await getToken('planner');

    // Fetch the specific handover record
    const { status, data } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const ho = data.data;
    expect(ho.id).toBe(handoverId);
    expect(ho.status).toBe('confirmed');
    expect(ho.handedOverById).toBe(techSingleUserId);
    expect(ho.receivedById).toBe(techAssistantUserId);

    // Verify timestamps exist (createdAt, confirmedAt should be present)
    expect(ho.createdAt).toBeTruthy();
    expect(ho.confirmedAt).toBeTruthy();
  });
});
