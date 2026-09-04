/**
 * Scenario K — Start Readiness (UAT-11)
 *
 * Proves the same server readiness contract consumed by TechnicianWorkspace:
 * - an assigned technician gets ready=true before a clean start;
 * - canonical Start succeeds when readiness is clear;
 * - an unresolved shift handover produces MANDATORY_HANDOVER_PENDING;
 * - the canonical Start endpoint cannot bypass that blocker;
 * - after designated receiver confirmation, execution can resume normally.
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
} from './helpers/api';

test('UAT-11: Scenario K — Server-authoritative start readiness', async () => {
  const plannerToken = await getToken('planner');
  const requesterToken = await getToken('requester');
  const supervisorToken = await getToken('supervisor');
  const outgoingToken = await getToken('tech_single');
  const incomingToken = await getToken('tech_assistant');

  const outgoingUserId = await lookupUserByKey(plannerToken, 'tech_single');
  const incomingUserId = await lookupUserByKey(plannerToken, 'tech_assistant');
  const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
  const plantId = await lookupPlantId(plannerToken, 'PLANT-A');

  let woId = '';
  let handoverId = '';

  await test.step('K1: Assigned technician is start-ready before execution', async () => {
    const mr = await createMR(requesterToken, {
      title: 'UAT-StartReadiness-Pump-Inspection',
      description: 'Validate start readiness and shift-handover blocking.',
      assetId,
      priority: 'medium',
      plantId,
    });
    await approveMR(supervisorToken, mr.id);

    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: outgoingUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'medium',
    });
    woId = wo.id;
    await assignWO(plannerToken, woId, { assignedTo: outgoingUserId });

    const readiness = await apiCall(
      outgoingToken,
      'GET',
      `/api/work-orders/${woId}/readiness?phase=start`,
    );
    expect(readiness.status).toBe(200);
    expect(readiness.data.success).toBe(true);
    expect(readiness.data.data.ready).toBe(true);
    expect(readiness.data.data.blockers).toEqual([]);

    await startWO(outgoingToken, woId);
    expect((await getWO(outgoingToken, woId)).status).toBe('in_progress');
  });

  await test.step('K2: Pending handover is exposed as a start-readiness blocker', async () => {
    const handover = await apiCall(
      outgoingToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      {
        action: 'initiate',
        receivedById: incomingUserId,
        shiftType: 'morning',
        tasksSummary: [{ task: 'Continue pump inspection' }],
        pendingIssues: [{ issue: 'Confirm coupling alignment' }],
        safetyNotes: 'LOTO remains applied until receiver confirmation',
        reason: 'Shift change for start-readiness UAT',
      },
    );
    expect(handover.status).toBe(200);
    expect(handover.data.success).toBe(true);
    expect(handover.data.data.status).toBe('pending_handover');
    handoverId = handover.data.data.handoverId;

    const readiness = await apiCall(
      outgoingToken,
      'GET',
      `/api/work-orders/${woId}/readiness?phase=start`,
    );
    expect(readiness.status).toBe(200);
    expect(readiness.data.success).toBe(true);
    expect(readiness.data.data.ready).toBe(false);
    expect(
      (readiness.data.data.blockers as Array<{ code: string }>).some(
        (blocker) => blocker.code === 'MANDATORY_HANDOVER_PENDING',
      ),
    ).toBe(true);
  });

  await test.step('K3: Canonical Start cannot bypass the unresolved handover', async () => {
    const startAttempt = await apiCall(
      outgoingToken,
      'POST',
      `/api/work-orders/${woId}/start`,
      { reason: 'Attempted start during pending handover' },
    );

    expect(startAttempt.status).toBe(422);
    expect(startAttempt.data.success).toBe(false);
    expect(
      (startAttempt.data.blockers as Array<{ code: string }>).some(
        (blocker) => blocker.code === 'MANDATORY_HANDOVER_PENDING',
      ),
    ).toBe(true);
    expect((await getWO(plannerToken, woId)).status).toBe('pending_handover');
  });

  await test.step('K4: Receiver confirms, resumes, then leaves no live-session residue', async () => {
    const confirmation = await apiCall(
      incomingToken,
      'POST',
      `/api/shift-handovers/${handoverId}/confirm`,
      {},
    );
    expect(confirmation.status).toBe(200);
    expect(confirmation.data.success).toBe(true);

    const resume = await apiCall(
      incomingToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(resume.status).toBe(200);
    expect(resume.data.success).toBe(true);
    expect(resume.data.data.status).toBe('in_progress');
    expect(resume.data.data.assignedTo).toBe(incomingUserId);

    const stop = await apiCall(
      incomingToken,
      'POST',
      `/api/work-orders/${woId}/time-logs/stop`,
      {},
    );
    expect(stop.status).toBe(200);
    expect(stop.data.success).toBe(true);
    expect(stop.data.data.closedTimers).toBeGreaterThanOrEqual(1);
  });
});
