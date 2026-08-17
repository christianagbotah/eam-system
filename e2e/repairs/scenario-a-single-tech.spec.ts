/**
 * Scenario A — Single Technician Full Lifecycle
 *
 * Covers the entire WO lifecycle from MR creation to WO closure.
 * All mutations go through the API helpers. The browser is used ONLY
 * to verify the UI reflects the correct server state after each mutation.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWODetail,
} from './helpers/auth';
import {
  getToken,
  createMR,
  approveMR,
  convertMR,
  assignWO,
  startWO,
  logTime,
  completeWO,
  verifyWO,
  closeWO,
  getWO,
  getMR,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  expectFailure,
} from './helpers/api';

test.describe('Scenario A: Single-Tech Full Lifecycle', () => {
  let context: BrowserContext;

  // IDs resolved from API responses
  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    // Pre-resolve IDs via API
    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // A1: Requester creates MR
  // ────────────────────────────────────────────────────────────────────
  test('A1: Requester creates Maintenance Request', async () => {
    const token = await getToken('requester');

    const mr = await createMR(token, {
      title: 'UAT-SingleTech-Pump-Vibration',
      description: 'Abnormal vibration at 3000 RPM on centrifugal pump. Needs bearing inspection.',
      assetId,
      priority: 'high',
      plantId,
    });

    mrId = mr.id;
    expect(mrId).toBeTruthy();
    expect(mr.requestNumber).toMatch(/^MR-\d{6}-\d{4}$/);

    // Server-state verification: fetch MR and assert status is 'pending'
    const fetched = await getMR(token, mrId);
    expect(fetched.status).toBe('pending');
  });

  // ────────────────────────────────────────────────────────────────────
  // A2: Supervisor approves MR
  // ────────────────────────────────────────────────────────────────────
  test('A2: Supervisor approves Maintenance Request', async () => {
    const token = await getToken('supervisor');

    const result = await approveMR(token, mrId);
    expect(result.status).toBe('approved');

    // Server-state verification
    const fetched = await getMR(token, mrId);
    expect(fetched.status).toBe('approved');
  });

  // ────────────────────────────────────────────────────────────────────
  // A3: Planner converts MR to WO and assigns technician
  // ────────────────────────────────────────────────────────────────────
  test('A3: Planner converts MR to WO and assigns technician', async () => {
    const token = await getToken('planner');

    const wo = await convertMR(token, mrId, {
      assignedTo: techSingleUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
      priority: 'high',
    });

    woId = wo.id;
    expect(woId).toBeTruthy();
    expect(wo.woNumber).toMatch(/^WO-\d{6}-\d{4}$/);

    // Server-state verification: WO is assigned
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('assigned');
    expect(fetched.assignedTo).toBe(techSingleUserId);

    // MR status should be 'converted'
    const mr = await getMR(token, mrId);
    expect(mr.status).toBe('converted');
  });

  // ────────────────────────────────────────────────────────────────────
  // A4: Technician starts work
  // ────────────────────────────────────────────────────────────────────
  test('A4: Technician starts work on WO', async () => {
    const token = await getToken('tech_single');

    const result = await startWO(token, woId);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('in_progress');
    expect(fetched.actualStart).toBeTruthy();

    // UI verification
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('in_progress', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // A5: Technician logs time
  // ────────────────────────────────────────────────────────────────────
  test('A5: Technician logs time on WO', async () => {
    const token = await getToken('tech_single');

    const timeLog = await logTime(token, woId, {
      action: 'start',
      manualHours: 2.5,
      notes: 'Disassembled pump casing, inspected bearings',
    });

    expect(timeLog).toBeTruthy();
    expect(timeLog.id).toBeTruthy();

    // Server-state: verify WO actualHours updated
    const fetched = await getWO(token, woId);
    expect(fetched.actualHours).toBeGreaterThanOrEqual(2.5);
  });

  // ────────────────────────────────────────────────────────────────────
  // A6: Technician completes WO
  // ────────────────────────────────────────────────────────────────────
  test('A6: Technician completes WO', async () => {
    const token = await getToken('tech_single');

    const result = await completeWO(token, woId, 'Bearing replaced. Vibration normalized to 0.5mm/s.');
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('completed');
    // Costs should be server-derived (we don't send them)
    expect(fetched.actualHours).toBeGreaterThanOrEqual(2.5);

    // UI verification
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // A7: Supervisor verifies WO
  // ────────────────────────────────────────────────────────────────────
  test('A7: Supervisor verifies completed WO', async () => {
    const token = await getToken('supervisor');

    const result = await verifyWO(token, woId, 4);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('verified');
  });

  // ────────────────────────────────────────────────────────────────────
  // A8: Planner closes WO
  // ────────────────────────────────────────────────────────────────────
  test('A8: Planner closes WO', async () => {
    const token = await getToken('planner');

    const result = await closeWO(token, woId);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('closed');
    expect(fetched.isLocked).toBe(true);

    // UI verification
    await authenticateAs(context, 'planner');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('closed', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // A9: Verify closed WO cannot be restarted
  // ────────────────────────────────────────────────────────────────────
  test('A9: Closed WO cannot be restarted', async () => {
    const token = await getToken('tech_single');

    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${woId}/start`);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // A10: Download closed WO pack (PDF)
  // ────────────────────────────────────────────────────────────────────
  test('A10: Download closed WO pack (PDF)', async () => {
    const token = await getToken('planner');

    const res = await fetch(`http://localhost:3000/api/work-orders/${woId}/closed-pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Should return binary (PDF) — content-type should be application/pdf
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('application/pdf');
  });
});
