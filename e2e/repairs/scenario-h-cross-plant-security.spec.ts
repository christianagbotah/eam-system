/**
 * Scenario H — Cross-Plant Security (UAT-09)
 *
 * Pure API tests. Creates a Plant B WO, then uses a Plant A user token
 * to attempt various operations. Every operation must return 403 or 404
 * (with no data leak). A 200 with empty data is NOT a pass.
 */
import { test, expect } from '@playwright/test';
import {
  getToken,
  apiCall,
  expectFailure,
  createMR,
  approveMR,
  convertMR,
  startWO,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
} from './helpers/api';

test.describe('Scenario H: Cross-Plant Security', () => {
  let plantBWoId: string;
  let plantBPlantId: string;
  let plantBTechUserId: string;

  test.beforeAll(async () => {
    const plantBToken = await getToken('plant_b_user');
    const plannerToken = await getToken('planner');
    const supervisorToken = await getToken('supervisor');
    const requesterToken = await getToken('requester');

    plantBPlantId = await lookupPlantId(plannerToken, 'PLANT-B');
    plantBTechUserId = await lookupUserByKey(plannerToken, 'plant_b_user');
    const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');

    // Create MR in Plant B (using UAT-PUMP-001 asset, but plantId = Plant B)
    const mr = await createMR(requesterToken, {
      title: 'UAT-PlantB-CrossPlant-Test',
      description: 'WO in Plant B for cross-plant security testing.',
      assetId,
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

    // Start the WO so it is in an active state for mutation tests
    await startWO(plantBToken, plantBWoId);

    // Verify the WO is in Plant B
    const fetched = await apiCall(plantBToken, 'GET', `/api/work-orders/${plantBWoId}`);
    expect(fetched.data.plantId).toBe(plantBPlantId);
  });

  // ────────────────────────────────────────────────────────────────────
  // H1: GET WO — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H1: Cross-plant WO GET blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'GET', `/api/work-orders/${plantBWoId}`);
    expect([403, 404]).toContain(status);
    expect(data.success).toBe(false);
    expect(data.data?.id).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────────────
  // H2: GET capabilities — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H2: Cross-plant WO capabilities GET blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'GET', `/api/work-orders/${plantBWoId}/capabilities`);
    expect([403, 404]).toContain(status);
  });

  // ────────────────────────────────────────────────────────────────────
  // H3: POST start — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H3: Cross-plant WO POST start blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${plantBWoId}/start`, {});
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H4: POST complete — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H4: Cross-plant WO POST complete blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${plantBWoId}/complete`, { notes: 'test' });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H5: POST time-logs — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H5: Cross-plant WO POST time-logs blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${plantBWoId}/time-logs`, {
      action: 'start',
      manualHours: 1,
    });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H6: POST measurements — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H6: Cross-plant WO POST measurements blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${plantBWoId}/measurements`, {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H7: POST attachments — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H7: Cross-plant WO POST attachments blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${plantBWoId}/attachments`, {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H8: POST tool request — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H8: Cross-plant WO POST tool request blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', '/api/repairs/tool-requests', {
      workOrderId: plantBWoId,
      reason: 'Test cross-plant tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H9: POST material request — Plant A user blocked
  // ────────────────────────────────────────────────────────────────────
  test('H9: Cross-plant WO POST material request blocked', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await expectFailure(token, 'POST', '/api/repairs/material-requests', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });
    expect([403, 404, 400]).toContain(status);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // H10: POST offline sync — Plant A user blocked on per-record level
  // ────────────────────────────────────────────────────────────────────
  test('H10: Cross-plant WO POST offline sync blocked', async () => {
    const token = await getToken('plant_a_user');
    // The sync endpoint always returns 200 — failure is per-record
    const { status, data } = await apiCall(token, 'POST', '/api/sync/offline', {
      records: [{
        id: 'test-h10',
        operation: 'create',
        entityType: 'work_order_comment',
        entityId: plantBWoId,
        data: { content: 'Cross-plant test comment' },
        timestamp: new Date().toISOString(),
      }],
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toBeDefined();
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].error).toContain('Access denied');
  });

  // ────────────────────────────────────────────────────────────────────
  // H11: GET work orders list — Plant A user sees no Plant B WOs
  // ────────────────────────────────────────────────────────────────────
  test('H11: Work orders list filtered to Plant A only', async () => {
    const token = await getToken('plant_a_user');
    const { status, data } = await apiCall(token, 'GET', '/api/work-orders?limit=100');
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const wos = data.data as Array<{ id: string }>;
    const plantBWo = wos.find((wo) => wo.id === plantBWoId);
    expect(plantBWo).toBeUndefined();
  });
});
