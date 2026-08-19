/**
 * Scenario F — Shift Handover Lifecycle (UAT-08)
 *
 * Tests the REAL end-to-end shift handover flow:
 *   F1: Create MR → supervisor approve → planner convert → assign tech → start work
 *   F2: Technician initiates handover → verify pending_handover status + ShiftHandover record
 *   F3: Attempt to start work BEFORE confirmation — must be blocked
 *   F4: Non-receiver cannot confirm handover
 *   F5: Designated receiver (tech_assistant) confirms the handover
 *   F6: Original technician cannot resume (not the receiver)
 *   F7: Receiver (tech_assistant) successfully resumes work
 *   F8: WO is back to in_progress with audit trail
 *
 * ALL assertions are server-state based (API responses), never UI text.
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

test('UAT-08: Scenario F — Shift Handover Lifecycle', async ({ page, browser }) => {
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

  // ── F2: Technician initiates handover (atomic: timer + WO + ShiftHandover) ────
  await test.step('F2: Technician initiates handover — atomic creation', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');
    const techAssistantUserId = await lookupUserByKey(plannerToken, 'tech_assistant');

    // Initiate handover with receivedById = tech_assistant
    const { status, data } = await apiCall(
      techToken, 'POST', `/api/work-orders/${woId}/handover`, {
        action: 'initiate',
        receivedById: techAssistantUserId,
        shiftType: 'morning',
        tasksSummary: [{ task: 'Bearing partially removed, need to continue' }],
        pendingIssues: [{ issue: 'No spare bearing on site' }],
        safetyNotes: 'LOTO still applied',
        reason: 'End of shift — bearing partially removed',
      },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('pending_handover');
    expect(data.data.handoverId).toBeTruthy();
    handoverId = data.data.handoverId;

    // Verify ShiftHandover record was created atomically
    const { status: shStatus, data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(shStatus).toBe(200);
    expect(shData.success).toBe(true);
    expect(shData.data.status).toBe('pending');
    expect(shData.data.handedOverById).toBeTruthy();
    expect(shData.data.workOrderId).toBe(woId);
  });

  // ── F3: Cannot start work while pending_handover ─────────────────────
  await test.step('F3: Cannot start work while pending_handover', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    const { status } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/start`, {},
    );
    expect(status).toBeGreaterThanOrEqual(400);

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F4: Non-receiver cannot confirm handover ──────────────────────────
  await test.step('F4: Non-receiver (tech_single) cannot confirm their own handover', async () => {
    const techToken = await getToken('tech_single');

    const { status, data } = await expectFailure(
      techToken, 'POST', `/api/shift-handovers/${handoverId}/confirm`, {},
    );
    expect(status).toBe(403);

    // Handover still pending
    const { data: shData } = await apiCall(
      techToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(shData.data.status).toBe('pending');
  });

  // ── F5: Designated receiver (tech_assistant) confirms handover ────────────
  await test.step('F5: Receiver (tech_assistant) confirms handover', async () => {
    const techAssistantToken = await getToken('tech_assistant');

    const { status, data } = await apiCall(
      techAssistantToken, 'POST', `/api/shift-handovers/${handoverId}/confirm`, {},
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('confirmed');

    // WO should still be pending_handover (confirm doesn't transition WO)
    const { data: woData } = await apiCall(
      techAssistantToken, 'GET', `/api/work-orders/${woId}`,
    );
    expect(woData.data.status).toBe('pending_handover');
  });

  // ── F6: Original technician cannot resume (not the receiver) ────────────
  await test.step('F6: Original technician (tech_single) cannot resume', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    const { status } = await expectFailure(
      techToken, 'POST', `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(status).toBeGreaterThanOrEqual(400);

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  // ── F7: Receiver successfully resumes work ──────────────────────────────
  await test.step('F7: Receiver (tech_assistant) successfully resumes work', async () => {
    const techAssistantToken = await getToken('tech_assistant');

    const { status, data } = await apiCall(
      techAssistantToken, 'POST', `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('in_progress');
  });

  // ── F8: WO is back to in_progress — full lifecycle proven ────────────────
  await test.step('F8: WO is in_progress with audit trail', async () => {
    const plannerToken = await getToken('planner');

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('in_progress');

    // Verify ShiftHandover record is confirmed
    const { data: shData } = await apiCall(
      plannerToken, 'GET', `/api/shift-handovers/${handoverId}`,
    );
    expect(shData.data.status).toBe('confirmed');
  });
});
