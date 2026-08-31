/**
 * Scenario H — Cross-Plant Security Isolation (UAT-09)
 *
 * Proves that plant membership isolation is enforced independently of
 * functional role permissions. The Plant-B WO is intentionally assetless:
 * this scenario tests plant isolation, while asset/plant integrity is covered
 * elsewhere by production validation.
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
  expect(data.data?.id).toBeUndefined();
}

async function assertPostBlocked(token: string, path: string, body?: unknown) {
  const { status, data } = await expectFailure(token, 'POST', path, body);
  expect([400, 403, 404, 422]).toContain(status);
  expect(data.success).toBe(false);
}

async function assertNotInList(token: string, path: string, workOrderId: string) {
  const { status, data } = await apiCall(token, 'GET', path);
  expect(status).toBe(200);
  const rows = (data.data ?? data.items ?? data.results ?? data.workOrders ?? []) as Array<{ id?: string }>;
  expect(rows.find((row) => row.id === workOrderId)).toBeUndefined();
}

async function assertActorBlocked(token: string, woId: string) {
  const getPaths = [
    `/api/work-orders/${woId}`,
    `/api/work-orders/${woId}/capabilities`,
    `/api/work-orders/${woId}/materials`,
    `/api/work-orders/${woId}/comments`,
    `/api/work-orders/${woId}/time-logs`,
  ];
  for (const path of getPaths) await assertGetBlocked(token, path);

  const mutations: Array<[string, unknown]> = [
    [`/api/work-orders/${woId}/start`, {}],
    [`/api/work-orders/${woId}/complete`, { notes: 'cross-plant denial test' }],
    [`/api/work-orders/${woId}/verify`, { qualityRating: 4 }],
    [`/api/work-orders/${woId}/rework`, { reason: 'cross-plant denial test' }],
    [`/api/work-orders/${woId}/close`, {}],
    [`/api/work-orders/${woId}/approve`, {}],
    [`/api/work-orders/${woId}/handover`, { reason: 'cross-plant denial test' }],
    [`/api/work-orders/${woId}/time-logs`, { action: 'start', manualHours: 1 }],
    [`/api/work-orders/${woId}/measurements`, {
      componentId: 'cross-plant-invalid-component',
      parameterKey: 'vibration',
      value: 4.2,
      unit: 'mm/s',
    }],
    [`/api/work-orders/${woId}/attachments`, {
      fileName: 'cross-plant-test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.invalid/cross-plant-test.pdf',
    }],
  ];
  for (const [path, body] of mutations) await assertPostBlocked(token, path, body);

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
  let plantBWoId: string;
  let plantBPlantId: string;
  let techAToken: string;
  let supervisorAToken: string;
  let plannerAToken: string;

  await test.step('H0: Create and start a real Plant B Work Order', async () => {
    const plantBToken = await getToken('plant_b_user');
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

    // getWO unwraps the API envelope; the previous test accidentally asserted
    // against apiCall().data (the envelope) instead of apiCall().data.data.
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

  await test.step('H4: Forged X-Plant-ID=Plant-B header cannot bypass membership', async () => {
    const attempts: Array<[
      string,
      'GET' | 'POST',
      string,
      unknown?,
    ]> = [
      ['supervisor GET', 'GET', `/api/work-orders/${plantBWoId}`],
      ['supervisor verify', 'POST', `/api/work-orders/${plantBWoId}/verify`, { qualityRating: 4 }],
      ['supervisor close', 'POST', `/api/work-orders/${plantBWoId}/close`, {}],
    ];

    for (const [, method, path, body] of attempts) {
      const result = await expectFailureWithPlant(
        supervisorAToken,
        method,
        path,
        plantBPlantId,
        body,
      );
      expect([400, 403, 404, 422]).toContain(result.status);
      expect(result.data.success).toBe(false);
    }

    const plannerGet = await expectFailureWithPlant(
      plannerAToken,
      'GET',
      `/api/work-orders/${plantBWoId}`,
      plantBPlantId,
    );
    expect([403, 404]).toContain(plannerGet.status);

    const plannerClose = await expectFailureWithPlant(
      plannerAToken,
      'POST',
      `/api/work-orders/${plantBWoId}/close`,
      plantBPlantId,
      {},
    );
    expect([400, 403, 404, 422]).toContain(plannerClose.status);
    expect(plannerClose.data.success).toBe(false);
  });

  await test.step('H5: Plant B WO is absent from Plant A lists and reports', async () => {
    for (const token of [techAToken, supervisorAToken, plannerAToken]) {
      await assertNotInList(token, '/api/work-orders?limit=100', plantBWoId);
    }

    for (const token of [supervisorAToken, plannerAToken]) {
      const woReport = await apiCall(token, 'GET', '/api/work-orders/reports?limit=100');
      expect(woReport.status).toBe(200);
      const woRows = woReport.data.data ?? woReport.data.workOrders ?? [];
      if (Array.isArray(woRows)) {
        expect((woRows as Array<{ id?: string }>).find((row) => row.id === plantBWoId)).toBeUndefined();
      }

      const repairReport = await apiCall(token, 'GET', '/api/repairs/reports/detailed?limit=100');
      expect(repairReport.status).toBe(200);
      const repairRows = repairReport.data.data ?? repairReport.data.workOrders ?? [];
      if (Array.isArray(repairRows)) {
        expect((repairRows as Array<{ id?: string }>).find((row) => row.id === plantBWoId)).toBeUndefined();
      }
    }
  });
});
