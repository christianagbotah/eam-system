/**
 * Scenario H — Cross-Plant Security Isolation (UAT-09)
 *
 * Proves plant membership isolation independently of functional RBAC. Every
 * denial is exercised through a real route/method; HTTP 405 is not accepted as
 * evidence of security enforcement.
 */
import { test, expect } from '@playwright/test';
import {
  getToken,
  apiCall,
  expectFailure,
  expectFailureWithPlant,
  createMR,
  approveMR,
  convertMR,
  startWO,
  getWO,
  lookupUserByKey,
  lookupPlantId,
} from './helpers/api';

async function assertGetBlocked(token: string, path: string) {
  const { status, data } = await expectFailure(token, 'GET', path);
  expect([403, 404]).toContain(status);
  expect(data.success).toBe(false);
}

async function assertPostBlocked(token: string, path: string, body?: unknown) {
  const { status, data } = await expectFailure(token, 'POST', path, body);
  expect([400, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(405);
  expect(data.success).toBe(false);
}

async function assertNotInList(token: string, path: string, workOrderId: string) {
  const { status, data } = await apiCall(token, 'GET', path);
  expect(status).toBe(200);
  const rows = (data.data ?? data.items ?? data.results ?? data.workOrders ?? []) as Array<{ id?: string }>;
  expect(rows.find((row) => row.id === workOrderId)).toBeUndefined();
}

async function assertActorBlocked(token: string, woId: string) {
  // Known read routes that all enforce WO plant scope.
  await assertGetBlocked(token, `/api/work-orders/${woId}`);
  await assertGetBlocked(token, `/api/work-orders/${woId}/capabilities`);
  await assertGetBlocked(token, `/api/work-orders/${woId}/time-logs`);

  // Known mutation routes. Do not use nonexistent /approve or /rework methods as
  // a security signal; a 405 only proves routing, not authorization.
  await assertPostBlocked(token, `/api/work-orders/${woId}/start`, {});
  await assertPostBlocked(token, `/api/work-orders/${woId}/complete`, { notes: 'cross-plant denial test' });
  await assertPostBlocked(token, `/api/work-orders/${woId}/verify`, { qualityRating: 4 });
  await assertPostBlocked(token, `/api/work-orders/${woId}/close`, {});
  await assertPostBlocked(token, `/api/work-orders/${woId}/handover`, { reason: 'cross-plant denial test' });
  await assertPostBlocked(token, `/api/work-orders/${woId}/time-logs`, { action: 'start', manualHours: 1 });
  await assertPostBlocked(token, `/api/work-orders/${woId}/measurements`, {
    componentId: 'cross-plant-invalid-component',
    parameterKey: 'vibration',
    value: 4.2,
    unit: 'mm/s',
  });

  await assertPostBlocked(token, '/api/repairs/tool-requests', {
    workOrderId: woId,
    reason: 'Cross-plant tool request',
    items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
  });
  await assertPostBlocked(token, '/api/repairs/material-requests', {
    workOrderId: woId,
    itemName: 'Test Bearing',
    quantityRequested: 2,
    unit: 'each',
  });

  await assertNotInList(token, '/api/work-orders?limit=100', woId);
}

test('UAT-09: Scenario H — Cross-Plant Security Isolation', async () => {
  let plantBWoId = '';
  let plantBPlantId = '';
  let plantBToken = '';
  let techAToken = '';
  let supervisorAToken = '';
  let plannerAToken = '';

  await test.step('H0: Create and start a real Plant B Work Order', async () => {
    plantBToken = await getToken('plant_b_user');
    const plannerToken = await getToken('planner');
    const supervisorToken = await getToken('supervisor');
    const requesterToken = await getToken('requester');

    plantBPlantId = await lookupPlantId(plannerToken, 'PLANT-B');
    const plantBTechUserId = await lookupUserByKey(plannerToken, 'plant_b_user');

    const mr = await createMR(requesterToken, {
      title: 'UAT-PlantB-CrossPlant-Security-Test',
      description: 'Assetless Plant B WO used only for plant-isolation verification.',
      priority: 'medium',
      plantId: plantBPlantId,
    });
    await approveMR(supervisorToken, mr.id);

    const wo = await convertMR(plannerToken, mr.id, {
      assignedTo: plantBTechUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'medium',
    });
    plantBWoId = wo.id;
    expect(plantBWoId).toBeTruthy();

    await startWO(plantBToken, plantBWoId);
    const fetched = await getWO(plantBToken, plantBWoId);
    expect(fetched.plantId).toBe(plantBPlantId);
    expect(fetched.status).toBe('in_progress');

    techAToken = await getToken('plant_a_user');
    supervisorAToken = await getToken('supervisor_plant_a');
    plannerAToken = await getToken('planner_plant_a');
  });

  await test.step('H1: Plant A technician is blocked from Plant B WO', async () => {
    await assertActorBlocked(techAToken, plantBWoId);
  });

  await test.step('H2: Plant A supervisor is blocked despite broad functional permissions', async () => {
    await assertActorBlocked(supervisorAToken, plantBWoId);
  });

  await test.step('H3: Plant A planner is blocked despite broad functional permissions', async () => {
    await assertActorBlocked(plannerAToken, plantBWoId);
  });

  await test.step('H4: Forged X-Plant-ID=Plant-B cannot bypass membership', async () => {
    for (const token of [supervisorAToken, plannerAToken]) {
      const getResult = await expectFailureWithPlant(
        token,
        'GET',
        `/api/work-orders/${plantBWoId}`,
        plantBPlantId,
      );
      expect([403, 404]).toContain(getResult.status);
      expect(getResult.data.success).toBe(false);

      const closeResult = await expectFailureWithPlant(
        token,
        'POST',
        `/api/work-orders/${plantBWoId}/close`,
        plantBPlantId,
        {},
      );
      expect([400, 403, 404, 422]).toContain(closeResult.status);
      expect(closeResult.status).not.toBe(405);
      expect(closeResult.data.success).toBe(false);
    }
  });

  await test.step('H5: Plant B WO is absent from Plant A lists and reports', async () => {
    for (const token of [techAToken, supervisorAToken, plannerAToken]) {
      await assertNotInList(token, '/api/work-orders?limit=100', plantBWoId);
    }

    for (const token of [supervisorAToken, plannerAToken]) {
      const report = await apiCall(token, 'GET', '/api/repairs/reports/detailed?limit=100');
      expect(report.status).toBe(200);
      const rows = report.data.data ?? report.data.workOrders ?? [];
      if (Array.isArray(rows)) {
        expect((rows as Array<{ id?: string }>).find((row) => row.id === plantBWoId)).toBeUndefined();
      }
    }

    // H is a security-isolation test, not an ongoing execution test.
    const stopped = await apiCall(plantBToken, 'POST', `/api/work-orders/${plantBWoId}/time-logs/stop`, {});
    expect(stopped.status).toBe(200);
    expect(stopped.data.success).toBe(true);
  });
});
