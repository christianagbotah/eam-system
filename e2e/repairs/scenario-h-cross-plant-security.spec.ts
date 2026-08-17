/**
 * Scenario H — Cross-Plant Security Isolation (UAT-09)
 *
 * Proves that plant membership isolation is enforced INDEPENDENTLY of
 * role/assignment restrictions. Uses two Plant-A-only users:
 *
 *   1. uat_supervisor_plant_a    — supervisor (broad perms: verify, approve, rework)
 *   2. uat_planner_plant_a       — planner   (broad perms: close, approve)
 *
 * Both are plant-limited to Plant A. A Plant B WO is created (using
 * UAT-PUMP-B-001, a Plant-B asset), and every user must be blocked
 * from accessing it — regardless of how broad their functional permissions
 * are. This definitively proves isolation is based on plant membership,
 * not role restrictions.
 *
 * Every denied mutation is verified by GET-ing the resource with a
 * legitimate Plant-B token to confirm it remains unchanged.
 *
 * For each operation, BOTH approaches are tested:
 *   A. NO X-Plant-ID header (using expectFailure)
 *   B. Forged X-Plant-ID = Plant-B (using expectFailureWithPlant)
 *
 * Structure: single test() with test.step() calls (H0–H5).
 */
import { test, expect } from '@playwright/test';
import {
  getToken,
  apiCall,
  expectFailure,
  apiCallWithPlant,
  expectFailureWithPlant,
  createMR,
  approveMR,
  convertMR,
  startWO,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
} from './helpers/api';

// ── Shared assertion helpers ────────────────────────────────────────────

/** Assert GET on a cross-plant resource returns 403 or 404 */
async function assertGetBlocked(token: string, path: string) {
  const { status, data } = await expectFailure(token, 'GET', path);
  expect([403, 404]).toContain(status);
  expect(data.success).toBe(false);
  expect(data.data?.id).toBeUndefined();
}

/** Assert GET on a cross-plant resource with forged plant header returns 403 or 404 */
async function assertGetBlockedWithPlant(token: string, path: string, plantId: string) {
  const { status, data } = await expectFailureWithPlant(token, 'GET', path, plantId);
  expect([403, 404]).toContain(status);
  expect(data.success).toBe(false);
}

/**
 * Assert POST mutation on a cross-plant resource returns 403 or 404 (no header).
 * Then verify the resource is unchanged via GET with a legitimate Plant-B token.
 */
async function assertPostBlocked(
  attackerToken: string,
  path: string,
  plantBToken: string,
  plantBWoId: string,
  unchangedStatus: string,
  body?: unknown,
) {
  // A. NO X-Plant-ID header
  const { status, data } = await expectFailure(attackerToken, 'POST', path, body);
  expect([403, 404]).toContain(status);
  expect(data.success).toBe(false);

  // Verify resource unchanged after denied mutation
  const { data: unchangedData } = await apiCall(plantBToken, 'GET', `/api/work-orders/${plantBWoId}`);
  expect(unchangedData.data.status).toBe(unchangedStatus);
}

/**
 * Assert POST mutation on a cross-plant resource with forged X-Plant-ID returns 403 or 404.
 * Then verify the resource is unchanged via GET with a legitimate Plant-B token.
 */
async function assertPostBlockedWithPlant(
  attackerToken: string,
  path: string,
  plantId: string,
  plantBToken: string,
  plantBWoId: string,
  unchangedStatus: string,
  body?: unknown,
) {
  // B. Forged X-Plant-ID = Plant-B
  const { status, data } = await expectFailureWithPlant(attackerToken, 'POST', path, plantId, body);
  expect([403, 404]).toContain(status);
  expect(data.success).toBe(false);

  // Verify resource unchanged after denied mutation
  const { data: unchangedData } = await apiCall(plantBToken, 'GET', `/api/work-orders/${plantBWoId}`);
  expect(unchangedData.data.status).toBe(unchangedStatus);
}

/** Assert cross-plant WO is not visible in a list response */
async function assertNotInList(token: string, listPath: string, targetId: string) {
  const { status, data } = await apiCall(token, 'GET', listPath);
  expect(status).toBe(200);
  const items = (data.data ?? data.items ?? data.results ?? []) as Array<{ id?: string }>;
  const found = items.find((item) => item.id === targetId);
  expect(found).toBeUndefined();
}

test('UAT-09: Scenario H — Cross-Plant Security Isolation', async () => {
  // ──────────────────────────────────────────────────────────────────────
  // Shared state
  // ──────────────────────────────────────────────────────────────────────
  let plantBWoId: string;
  let plantBPlantId: string;
  let plantBTechUserId: string;
  let plantBToken: string;

  // Tokens for both Plant-A users
  let supervisorAToken: string;
  let plannerAToken: string;

  // ──────────────────────────────────────────────────────────────────────
  // H0: Create Plant B WO using UAT-PUMP-B-001 (Plant-B asset)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H0: Create Plant B Work Order', async () => {
    plantBToken = await getToken('plant_b_user');
    const plannerToken = await getToken('planner');
    const supervisorToken = await getToken('supervisor');
    const requesterToken = await getToken('requester');

    plantBPlantId = await lookupPlantId(plannerToken, 'PLANT-B');
    plantBTechUserId = await lookupUserByKey(plannerToken, 'plant_b_user');
    const assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-B-001');

    // Create MR in Plant B
    const mr = await createMR(requesterToken, {
      title: 'UAT-PlantB-CrossPlant-Security-Test',
      description: 'WO in Plant B for cross-plant security isolation testing.',
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
    const { data: fetched } = await apiCall(plantBToken, 'GET', `/api/work-orders/${plantBWoId}`);
    expect(fetched.data.plantId).toBe(plantBPlantId);
    expect(fetched.data.status).toBe('in_progress');

    // Get tokens for both Plant-A users
    supervisorAToken = await getToken('supervisor_plant_a');
    plannerAToken = await getToken('planner_plant_a');
  });

  // ──────────────────────────────────────────────────────────────────────
  // H1: Plant A SUPERVISOR — GET operations blocked (no header)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H1: Plant A SUPERVISOR — GET operations blocked (no X-Plant-ID)', async () => {
    // GET WO detail
    await assertGetBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}`);

    // GET capabilities
    const capRes = await expectFailure(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/capabilities`);
    expect([403, 404]).toContain(capRes.status);

    // GET materials for Plant B WO
    const matRes = await expectFailure(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/materials`);
    expect([403, 404]).toContain(matRes.status);

    // GET comments for Plant B WO
    const commentRes = await expectFailure(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/comments`);
    expect([403, 404]).toContain(commentRes.status);

    // GET time-logs for Plant B WO
    const timeLogRes = await expectFailure(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/time-logs`);
    expect([403, 404]).toContain(timeLogRes.status);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H2: Plant A SUPERVISOR — GET operations blocked (forged X-Plant-ID)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H2: Plant A SUPERVISOR — GET operations blocked (forged X-Plant-ID=Plant-B)', async () => {
    // GET WO detail — forged plant header
    await assertGetBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}`, plantBPlantId);

    // GET capabilities — forged plant header
    const capRes = await expectFailureWithPlant(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/capabilities`, plantBPlantId);
    expect([403, 404]).toContain(capRes.status);

    // GET materials — forged plant header
    const matRes = await expectFailureWithPlant(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/materials`, plantBPlantId);
    expect([403, 404]).toContain(matRes.status);

    // GET comments — forged plant header
    const commentRes = await expectFailureWithPlant(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/comments`, plantBPlantId);
    expect([403, 404]).toContain(commentRes.status);

    // GET time-logs — forged plant header
    const timeLogRes = await expectFailureWithPlant(supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}/time-logs`, plantBPlantId);
    expect([403, 404]).toContain(timeLogRes.status);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H3: Plant A SUPERVISOR — POST mutations blocked (no header + forged)
  //     Each mutation is tested BOTH ways and verified unchanged after.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H3: Plant A SUPERVISOR — all POST mutations blocked both ways', async () => {
    // POST approve
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/approve`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/approve`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST verify (supervisor's core permission)
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/verify`, plantBToken, plantBWoId, 'in_progress', { qualityRating: 4 });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/verify`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { qualityRating: 4 });

    // POST rework (supervisor's core permission)
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/rework`, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant rework' });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/rework`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant rework' });

    // POST close
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/close`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/close`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST handover
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/handover`, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant handover' });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/handover`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant handover' });

    // POST start
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/start`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/start`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST complete
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/complete`, plantBToken, plantBWoId, 'in_progress', { notes: 'Cross-plant complete' });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/complete`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { notes: 'Cross-plant complete' });

    // POST tool request linked to Plant B WO
    await assertPostBlocked(supervisorAToken, '/api/repairs/tool-requests', plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant supervisor tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });
    await assertPostBlockedWithPlant(supervisorAToken, '/api/repairs/tool-requests', plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant supervisor tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });

    // POST material request linked to Plant B WO
    await assertPostBlocked(supervisorAToken, '/api/repairs/material-requests', plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });
    await assertPostBlockedWithPlant(supervisorAToken, '/api/repairs/material-requests', plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });

    // POST time-logs on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/time-logs`, plantBToken, plantBWoId, 'in_progress', {
      action: 'start',
      manualHours: 1,
    });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/time-logs`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      action: 'start',
      manualHours: 1,
    });

    // POST measurements on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/measurements`, plantBToken, plantBWoId, 'in_progress', {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/measurements`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });

    // POST attachments
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/attachments`, plantBToken, plantBWoId, 'in_progress', {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
    await assertPostBlockedWithPlant(supervisorAToken, `/api/work-orders/${plantBWoId}/attachments`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // H4: Plant A PLANNER — GET operations blocked (no header)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H4: Plant A PLANNER — GET operations blocked (no X-Plant-ID)', async () => {
    // GET WO detail
    await assertGetBlocked(plannerAToken, `/api/work-orders/${plantBWoId}`);

    // GET capabilities
    const capRes = await expectFailure(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/capabilities`);
    expect([403, 404]).toContain(capRes.status);

    // GET materials for Plant B WO
    const matRes = await expectFailure(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/materials`);
    expect([403, 404]).toContain(matRes.status);

    // GET comments for Plant B WO
    const commentRes = await expectFailure(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/comments`);
    expect([403, 404]).toContain(commentRes.status);

    // GET time-logs for Plant B WO
    const timeLogRes = await expectFailure(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/time-logs`);
    expect([403, 404]).toContain(timeLogRes.status);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H5: Plant A PLANNER — GET operations blocked (forged X-Plant-ID)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H5: Plant A PLANNER — GET operations blocked (forged X-Plant-ID=Plant-B)', async () => {
    // GET WO detail — forged plant header
    await assertGetBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}`, plantBPlantId);

    // GET capabilities — forged plant header
    const capRes = await expectFailureWithPlant(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/capabilities`, plantBPlantId);
    expect([403, 404]).toContain(capRes.status);

    // GET materials — forged plant header
    const matRes = await expectFailureWithPlant(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/materials`, plantBPlantId);
    expect([403, 404]).toContain(matRes.status);

    // GET comments — forged plant header
    const commentRes = await expectFailureWithPlant(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/comments`, plantBPlantId);
    expect([403, 404]).toContain(commentRes.status);

    // GET time-logs — forged plant header
    const timeLogRes = await expectFailureWithPlant(plannerAToken, 'GET', `/api/work-orders/${plantBWoId}/time-logs`, plantBPlantId);
    expect([403, 404]).toContain(timeLogRes.status);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H6: Plant A PLANNER — POST mutations blocked (no header + forged)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H6: Plant A PLANNER — all POST mutations blocked both ways', async () => {
    // POST approve
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/approve`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/approve`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST verify
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/verify`, plantBToken, plantBWoId, 'in_progress', { qualityRating: 4 });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/verify`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { qualityRating: 4 });

    // POST rework
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/rework`, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant rework' });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/rework`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant rework' });

    // POST close (planner's core permission)
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/close`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/close`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST handover
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/handover`, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant handover' });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/handover`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { reason: 'Cross-plant handover' });

    // POST start
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/start`, plantBToken, plantBWoId, 'in_progress', {});
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/start`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {});

    // POST complete
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/complete`, plantBToken, plantBWoId, 'in_progress', { notes: 'Cross-plant complete' });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/complete`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', { notes: 'Cross-plant complete' });

    // POST tool request linked to Plant B WO
    await assertPostBlocked(plannerAToken, '/api/repairs/tool-requests', plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant planner tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });
    await assertPostBlockedWithPlant(plannerAToken, '/api/repairs/tool-requests', plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant planner tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });

    // POST material request linked to Plant B WO
    await assertPostBlocked(plannerAToken, '/api/repairs/material-requests', plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });
    await assertPostBlockedWithPlant(plannerAToken, '/api/repairs/material-requests', plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });

    // POST time-logs on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/time-logs`, plantBToken, plantBWoId, 'in_progress', {
      action: 'start',
      manualHours: 1,
    });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/time-logs`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      action: 'start',
      manualHours: 1,
    });

    // POST measurements on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/measurements`, plantBToken, plantBWoId, 'in_progress', {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/measurements`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });

    // POST attachments
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/attachments`, plantBToken, plantBWoId, 'in_progress', {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
    await assertPostBlockedWithPlant(plannerAToken, `/api/work-orders/${plantBWoId}/attachments`, plantBPlantId, plantBToken, plantBWoId, 'in_progress', {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // H7: Both Plant A users list WOs — Plant B WO must NOT appear
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H7: Plant A users list WOs without X-Plant-ID — no Plant B WOs visible', async () => {
    // Supervisor: list WOs
    await assertNotInList(supervisorAToken, '/api/work-orders?limit=100', plantBWoId);

    // Planner: list WOs
    await assertNotInList(plannerAToken, '/api/work-orders?limit=100', plantBWoId);

    // Supervisor: list WO reports without plant header — no Plant B data
    const supReportRes = await apiCall(supervisorAToken, 'GET', '/api/work-orders/reports?limit=100');
    expect(supReportRes.status).toBe(200);
    if (supReportRes.data.success !== false) {
      const reportWos = supReportRes.data.data ?? supReportRes.data.workOrders ?? [];
      if (Array.isArray(reportWos)) {
        const found = (reportWos as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    }

    // Planner: list WO reports without plant header — no Plant B data
    const planReportRes = await apiCall(plannerAToken, 'GET', '/api/work-orders/reports?limit=100');
    expect(planReportRes.status).toBe(200);
    if (planReportRes.data.success !== false) {
      const reportWos = planReportRes.data.data ?? planReportRes.data.workOrders ?? [];
      if (Array.isArray(reportWos)) {
        const found = (reportWos as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    }

    // Repair reports (detailed) — supervisor
    const repairReportRes = await apiCall(supervisorAToken, 'GET', '/api/repairs/reports/detailed?limit=100');
    expect(repairReportRes.status).toBe(200);
    if (repairReportRes.data.success !== false) {
      const repairWos = repairReportRes.data.data ?? repairReportRes.data.workOrders ?? [];
      if (Array.isArray(repairWos)) {
        const found = (repairWos as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    }

    // Repair reports (detailed) — planner
    const planRepairReportRes = await apiCall(plannerAToken, 'GET', '/api/repairs/reports/detailed?limit=100');
    expect(planRepairReportRes.status).toBe(200);
    if (planRepairReportRes.data.success !== false) {
      const repairWos = planRepairReportRes.data.data ?? planRepairReportRes.data.workOrders ?? [];
      if (Array.isArray(repairWos)) {
        const found = (repairWos as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    }
  });
});
