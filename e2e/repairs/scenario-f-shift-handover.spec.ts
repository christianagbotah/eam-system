/**
 * Scenario F — Shift Handover Lifecycle (UAT-08)
 *
 * Proves the real successful handover path:
 * outgoing technician → atomic handover creation → designated receiver confirms
 * → outgoing worker cannot resume → receiver resumes and becomes execution lead.
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

test('UAT-08: Scenario F — Shift Handover Lifecycle', async () => {
  let woId = '';
  let handoverId = '';
  let outgoingUserId = '';
  let incomingUserId = '';

  await test.step('F1: Create WO and start work with outgoing technician', async () => {
    const requesterToken = await getToken('requester');
    const supervisorToken = await getToken('supervisor');
    const plannerToken = await getToken('planner');
    const techToken = await getToken('tech_single');

    outgoingUserId = await lookupUserByKey(plannerToken, 'tech_single');
    incomingUserId = await lookupUserByKey(plannerToken, 'tech_assistant');
    const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    const plantId = await lookupPlantId(plannerToken, 'PLANT-A');

    const mr = await createMR(requesterToken, {
      title: 'UAT-ShiftHandover-Pump-Repair',
      description: 'Pump bearing replacement — will cross shift boundary.',
      assetId,
      priority: 'high',
      plantId,
    });

    await approveMR(supervisorToken, mr.id);
    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: outgoingUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'high',
    });
    woId = wo.id;
    expect(woId).toBeTruthy();

    await assignWO(plannerToken, woId, { assignedTo: outgoingUserId });
    await startWO(techToken, woId);

    const fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');
    expect(fetched.assignedTo).toBe(outgoingUserId);
  });

  await test.step('F2: Outgoing technician initiates atomic handover with receiver', async () => {
    const techToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    const { status, data } = await apiCall(
      techToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      {
        action: 'initiate',
        receivedById: incomingUserId,
        shiftType: 'morning',
        tasksSummary: [{ task: 'Bearing partially removed, continue installation' }],
        pendingIssues: [{ issue: 'Confirm replacement bearing fit' }],
        safetyNotes: 'LOTO remains applied',
        reason: 'End of outgoing shift',
      },
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('pending_handover');
    expect(data.data.handoverId).toBeTruthy();
    handoverId = data.data.handoverId;

    const { status: shStatus, data: shData } = await apiCall(
      plannerToken,
      'GET',
      `/api/shift-handovers/${handoverId}`,
    );
    expect(shStatus).toBe(200);
    expect(shData.data.status).toBe('pending');
    expect(shData.data.handedOverById).toBe(outgoingUserId);
    expect(shData.data.receivedById).toBe(incomingUserId);
    expect(shData.data.workOrderId).toBe(woId);
  });

  await test.step('F3: Work cannot resume before handover confirmation', async () => {
    const incomingToken = await getToken('tech_assistant');
    const plannerToken = await getToken('planner');

    const { status } = await expectFailure(
      incomingToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(status).toBeGreaterThanOrEqual(400);

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
  });

  await test.step('F4: Wrong user cannot confirm handover', async () => {
    const outgoingToken = await getToken('tech_single');

    const { status } = await expectFailure(
      outgoingToken,
      'POST',
      `/api/shift-handovers/${handoverId}/confirm`,
      {},
    );
    expect(status).toBe(403);
  });

  await test.step('F5: Designated receiver confirms handover', async () => {
    const incomingToken = await getToken('tech_assistant');

    const { status, data } = await apiCall(
      incomingToken,
      'POST',
      `/api/shift-handovers/${handoverId}/confirm`,
      {},
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('confirmed');
    expect(data.data.confirmedAt).toBeTruthy();
  });

  await test.step('F6: Outgoing technician cannot resume confirmed handover', async () => {
    const outgoingToken = await getToken('tech_single');
    const plannerToken = await getToken('planner');

    const { status } = await expectFailure(
      outgoingToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(status).toBeGreaterThanOrEqual(400);

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('pending_handover');
    expect(fetched.assignedTo).toBe(outgoingUserId);
  });

  await test.step('F7: Designated receiver resumes and becomes execution lead', async () => {
    const incomingToken = await getToken('tech_assistant');

    const { status, data } = await apiCall(
      incomingToken,
      'POST',
      `/api/work-orders/${woId}/handover`,
      { action: 'resume' },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('in_progress');
    expect(data.data.assignedTo).toBe(incomingUserId);
  });

  await test.step('F8: Server state proves authority transfer and incoming resume log', async () => {
    const plannerToken = await getToken('planner');

    const fetched = await getWO(plannerToken, woId);
    expect(fetched.status).toBe('in_progress');
    expect(fetched.assignedTo).toBe(incomingUserId);

    const { status: tlStatus, data: tlData } = await apiCall(
      plannerToken,
      'GET',
      `/api/work-orders/${woId}/time-logs`,
    );
    expect(tlStatus).toBe(200);
    const logs = (tlData.data || []) as Array<{ userId: string; action: string }>;
    expect(logs.some((log) => log.userId === incomingUserId && log.action === 'resume')).toBe(true);

    const { data: shData } = await apiCall(
      plannerToken,
      'GET',
      `/api/shift-handovers/${handoverId}`,
    );
    expect(shData.data.status).toBe('confirmed');
    expect(shData.data.receivedById).toBe(incomingUserId);
  });
});
