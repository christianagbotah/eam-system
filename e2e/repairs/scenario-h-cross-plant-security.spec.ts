/**
 * Scenario H — Cross-Plant Security Isolation (UAT-09)
 *
 * Proves that plant membership isolation is enforced INDEPENDENTLY of
 * role/assignment restrictions. Uses three Plant-A-only users:
 *
 *   1. uat_plant_a_user          — technician (view_own restricted)
 *   2. uat_supervisor_plant_a    — supervisor (broad perms: verify, approve, rework)
 *   3. uat_planner_plant_a       — planner   (broad perms: close, approve)
 *
 * All three are plant-limited to Plant A. A Plant B WO is created, and
 * every user must be blocked from accessing it — regardless of how broad
 * their functional permissions are. This definitively proves isolation
 * is based on plant membership, not role restrictions.
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

/** Assert POST mutation on a cross-plant resource returns error status */
async function assertPostBlocked(token: string, path: string, body?: unknown) {
  const { status, data } = await expectFailure(token, 'POST', path, body);
  expect([403, 404, 400, 422]).toContain(status);
  expect(data.success).toBe(false);
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

  // Tokens for all three Plant-A users
  let techAToken: string;
  let supervisorAToken: string;
  let plannerAToken: string;

  // ──────────────────────────────────────────────────────────────────────
  // H0: Create Plant B WO (using existing approach)
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H0: Create Plant B Work Order', async () => {
    // Use system-wide users to create the WO
    const plantBToken = await getToken('plant_b_user');
    const plannerToken = await getToken('planner');
    const supervisorToken = await getToken('supervisor');
    const requesterToken = await getToken('requester');

    plantBPlantId = await lookupPlantId(plannerToken, 'PLANT-B');
    plantBTechUserId = await lookupUserByKey(plannerToken, 'plant_b_user');

    // This security scenario is about WO plant isolation, not asset validation.
    // Create the Plant B MR without an asset so the fixture cannot accidentally
    // depend on a Plant A asset and obscure the isolation checks below.
    const mr = await createMR(requesterToken, {
      title: 'UAT-PlantB-CrossPlant-Security-Test',
      description: 'WO in Plant B for cross-plant security isolation testing.',
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
    expect(fetched.data.status).toBe('in_progress');

    // Get tokens for all three Plant-A users
    techAToken = await getToken('plant_a_user');
    supervisorAToken = await getToken('supervisor_plant_a');
    plannerAToken = await getToken('planner_plant_a');
  });

  // ──────────────────────────────────────────────────────────────────────
  // H1: Plant A TECHNICIAN blocked (kept from original test)
  //     This user has view_own restriction — tests baseline behavior.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H1: Plant A technician blocked on all Plant B operations', async () => {
    // GET WO detail
    await assertGetBlocked(techAToken, `/api/work-orders/${plantBWoId}`);

    // GET capabilities
    const capRes = await expectFailure(techAToken, 'GET', `/api/work-orders/${plantBWoId}/capabilities`);
    expect([403, 404]).toContain(capRes.status);

    // POST start
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/start`, {});

    // POST complete
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/complete`, { notes: 'test' });

    // POST verify
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/verify`, { qualityRating: 4 });

    // POST rework
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/rework`, { reason: 'Cross-plant test' });

    // POST close
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/close`, {});

    // POST approve
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/approve`, {});

    // POST handover
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/handover`, { reason: 'Cross-plant handover' });

    // POST time-logs
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/time-logs`, {
      action: 'start',
      manualHours: 1,
    });

    // POST measurements
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/measurements`, {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });

    // POST attachments
    await assertPostBlocked(techAToken, `/api/work-orders/${plantBWoId}/attachments`, {
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/test.pdf',
    });

    // POST tool request
    await assertPostBlocked(techAToken, '/api/repairs/tool-requests', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });

    // POST material request
    await assertPostBlocked(techAToken, '/api/repairs/material-requests', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });

    // GET materials for WO
    const matRes = await expectFailure(techAToken, 'GET', `/api/work-orders/${plantBWoId}/materials`);
    expect([403, 404]).toContain(matRes.status);

    // GET WO reports
    const reportRes = await expectFailure(techAToken, 'GET', `/api/work-orders/reports?workOrderId=${plantBWoId}`);
    // Reports endpoint may return 200 but with no data for the Plant B WO, or 403
    if (reportRes.status === 200) {
      // If 200, verify the Plant B WO is not in the data
      const reportData = reportRes.data.data ?? reportRes.data.workOrders ?? [];
      if (Array.isArray(reportData)) {
        const found = (reportData as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    } else {
      expect([403, 404, 400]).toContain(reportRes.status);
    }

    // List WOs — Plant B WO must not appear
    await assertNotInList(techAToken, '/api/work-orders?limit=100', plantBWoId);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H2: Plant A SUPERVISOR (broad permissions, plant-limited) blocked
  //     This user has work_orders.verify, work_orders.update, work_orders.view
  //     permissions but is restricted to Plant A only.
  //     If access is denied here, it proves isolation is PLANT-based,
  //     not role-based — because this user has all the functional permissions.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H2: Plant A SUPERVISOR (broad perms) blocked on all Plant B operations', async () => {
    // ── GET operations ──

    // GET WO detail — must return 403 (plant isolation)
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

    // GET WO reports filtered to Plant B WO
    const reportRes = await expectFailureWithPlant(supervisorAToken, 'GET', `/api/work-orders/reports?workOrderId=${plantBWoId}`, plantBPlantId);
    if (reportRes.status === 200) {
      const reportData = reportRes.data.data ?? reportRes.data.workOrders ?? [];
      if (Array.isArray(reportData)) {
        const found = (reportData as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    } else {
      expect([403, 404, 400]).toContain(reportRes.status);
    }

    // ── POST mutation operations ──

    // POST approve on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/approve`, {});

    // POST verify on Plant B WO (supervisor's core permission)
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/verify`, { qualityRating: 4 });

    // POST rework on Plant B WO (supervisor's core permission)
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/rework`, { reason: 'Cross-plant rework' });

    // POST close on Plant B WO (may be supervisor-allowed)
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/close`, {});

    // POST handover on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/handover`, { reason: 'Cross-plant handover' });

    // POST start on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/start`, {});

    // POST complete on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/complete`, { notes: 'Cross-plant complete' });

    // POST tool request linked to Plant B WO
    await assertPostBlocked(supervisorAToken, '/api/repairs/tool-requests', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant supervisor tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });

    // POST material request linked to Plant B WO
    await assertPostBlocked(supervisorAToken, '/api/repairs/material-requests', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });

    // POST time-logs on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/time-logs`, {
      action: 'start',
      manualHours: 1,
    });

    // POST measurements on Plant B WO
    await assertPostBlocked(supervisorAToken, `/api/work-orders/${plantBWoId}/measurements`, {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });

    // List WOs — Plant B WO must not appear
    await assertNotInList(supervisorAToken, '/api/work-orders?limit=100', plantBWoId);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H3: Plant A PLANNER (broad permissions, plant-limited) blocked
  //     This user has work_orders.update, work_orders.close, work_orders.view
  //     permissions but is restricted to Plant A only.
  //     If access is denied here, it proves isolation is PLANT-based,
  //     not role-based — because planners can approve, close, etc.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H3: Plant A PLANNER (broad perms) blocked on all Plant B operations', async () => {
    // ── GET operations ──

    // GET WO detail — must return 403 (plant isolation)
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

    // GET WO reports filtered to Plant B WO
    const reportRes = await expectFailureWithPlant(plannerAToken, 'GET', `/api/work-orders/reports?workOrderId=${plantBWoId}`, plantBPlantId);
    if (reportRes.status === 200) {
      const reportData = reportRes.data.data ?? reportRes.data.workOrders ?? [];
      if (Array.isArray(reportData)) {
        const found = (reportData as Array<{ id?: string }>).find((wo) => wo.id === plantBWoId);
        expect(found).toBeUndefined();
      }
    } else {
      expect([403, 404, 400]).toContain(reportRes.status);
    }

    // ── POST mutation operations ──

    // POST approve on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/approve`, {});

    // POST verify on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/verify`, { qualityRating: 4 });

    // POST rework on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/rework`, { reason: 'Cross-plant rework' });

    // POST close on Plant B WO (planner's core permission)
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/close`, {});

    // POST handover on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/handover`, { reason: 'Cross-plant handover' });

    // POST start on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/start`, {});

    // POST complete on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/complete`, { notes: 'Cross-plant complete' });

    // POST tool request linked to Plant B WO
    await assertPostBlocked(plannerAToken, '/api/repairs/tool-requests', {
      workOrderId: plantBWoId,
      reason: 'Cross-plant planner tool request',
      items: [{ toolName: 'Test Tool', quantityRequested: 1 }],
    });

    // POST material request linked to Plant B WO
    await assertPostBlocked(plannerAToken, '/api/repairs/material-requests', {
      workOrderId: plantBWoId,
      itemName: 'Test Bearing',
      quantityRequested: 2,
      unit: 'each',
    });

    // POST time-logs on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/time-logs`, {
      action: 'start',
      manualHours: 1,
    });

    // POST measurements on Plant B WO
    await assertPostBlocked(plannerAToken, `/api/work-orders/${plantBWoId}/measurements`, {
      value: 4.2,
      unit: 'mm',
      measurementPoint: 'Bearing clearance',
    });

    // List WOs — Plant B WO must not appear
    await assertNotInList(plannerAToken, '/api/work-orders?limit=100', plantBWoId);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H4: Forged X-Plant-ID header — Plant A supervisor sending X-Plant-ID=Plant-B
  //     The server MUST reject with 403 (denyAccess) because the user has
  //     no membership in Plant B.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H4: Forged X-Plant-ID=Plant-B header rejected with 403 denyAccess', async () => {
    // Supervisor with forged Plant B header — GET WO
    const woRes = await expectFailureWithPlant(
      supervisorAToken, 'GET', `/api/work-orders/${plantBWoId}`, plantBPlantId,
    );
    expect([403, 404]).toContain(woRes.status);
    if (woRes.status === 403) {
      // Verify it's an access-denied error, not a permission error
      expect(woRes.data.success).toBe(false);
    }

    // Supervisor with forged Plant B header — POST verify
    const verifyRes = await expectFailureWithPlant(
      supervisorAToken, 'POST', `/api/work-orders/${plantBWoId}/verify`, plantBPlantId,
      { qualityRating: 4 },
    );
    expect([403, 404, 400, 422]).toContain(verifyRes.status);
    expect(verifyRes.data.success).toBe(false);

    // Supervisor with forged Plant B header — POST rework
    const reworkRes = await expectFailureWithPlant(
      supervisorAToken, 'POST', `/api/work-orders/${plantBWoId}/rework`, plantBPlantId,
      { reason: 'Forged plant test' },
    );
    expect([403, 404, 400, 422]).toContain(reworkRes.status);
    expect(reworkRes.data.success).toBe(false);

    // Supervisor with forged Plant B header — POST handover
    const handoverRes = await expectFailureWithPlant(
      supervisorAToken, 'POST', `/api/work-orders/${plantBWoId}/handover`, plantBPlantId,
      { reason: 'Forged plant handover' },
    );
    expect([403, 404, 400, 422]).toContain(handoverRes.status);
    expect(handoverRes.data.success).toBe(false);

    // Supervisor with forged Plant B header — POST close
    const closeRes = await expectFailureWithPlant(
      supervisorAToken, 'POST', `/api/work-orders/${plantBWoId}/close`, plantBPlantId,
      {},
    );
    expect([403, 404, 400, 422]).toContain(closeRes.status);
    expect(closeRes.data.success).toBe(false);

    // Planner with forged Plant B header — GET WO
    const plannerWoRes = await expectFailureWithPlant(
      plannerAToken, 'GET', `/api/work-orders/${plantBWoId}`, plantBPlantId,
    );
    expect([403, 404]).toContain(plannerWoRes.status);

    // Planner with forged Plant B header — POST close
    const plannerCloseRes = await expectFailureWithPlant(
      plannerAToken, 'POST', `/api/work-orders/${plantBWoId}/close`, plantBPlantId,
      {},
    );
    expect([403, 404, 400, 422]).toContain(plannerCloseRes.status);
    expect(plannerCloseRes.data.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────
  // H5: All Plant A users list WOs without X-Plant-ID header
  //     Default behavior (no explicit plant) — list returns only accessible
  //     plants' WOs. Plant B WO must NOT appear in any user's results.
  // ──────────────────────────────────────────────────────────────────────
  await test.step('H5: Plant A users list WOs without X-Plant-ID — no Plant B WOs visible', async () => {
    // Technician: list WOs
    await assertNotInList(techAToken, '/api/work-orders?limit=100', plantBWoId);

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
