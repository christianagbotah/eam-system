/**
 * Scenario E — Rework Flow
 *
 * Tests: complete WO → supervisor requests rework →
 * WO returns to in_progress → second completion → verify → close.
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
  startWO,
  logTime,
  completeWO,
  verifyWO,
  closeWO,
  requestRework,
  getWO,
  getMR,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
} from './helpers/api';

test.describe('Scenario E: Rework Flow', () => {
  let context: BrowserContext;

  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // E1: Create WO, start, log time, complete (first time)
  // ────────────────────────────────────────────────────────────────────
  test('E1: Create, start, and complete WO (first time)', async () => {
    // Create MR
    const reqToken = await getToken('requester');
    const mr = await createMR(reqToken, {
      title: 'UAT-Rework-Bearing-Alignment',
      description: 'Bearing alignment issue. Vibration above threshold.',
      assetId,
      priority: 'high',
      plantId,
    });
    mrId = mr.id;
    expect(mrId).toBeTruthy();

    // Approve
    const supToken = await getToken('supervisor');
    await approveMR(supToken, mrId);
    let fetched = await getMR(supToken, mrId);
    expect(fetched.status).toBe('approved');

    // Convert and assign
    const planToken = await getToken('planner');
    const wo = await convertMR(planToken, mrId, {
      assignedTo: techSingleUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
    });
    woId = wo.id;
    expect(woId).toBeTruthy();

    // Start
    const techToken = await getToken('tech_single');
    await startWO(techToken, woId);
    fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');

    // Log time
    await logTime(techToken, woId, {
      action: 'start',
      manualHours: 3,
      notes: 'Initial bearing replacement done.',
    });

    // Complete (first time)
    const completed = await completeWO(techToken, woId, 'Bearing replaced. Initial completion.');
    expect(completed).toBeTruthy();

    // Server-state: completed
    const fetchedWO = await getWO(techToken, woId);
    expect(fetchedWO.status).toBe('completed');
    expect(fetchedWO.actualHours).toBeGreaterThanOrEqual(3);

    // UI verification
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // E2: Supervisor requests rework
  // ────────────────────────────────────────────────────────────────────
  test('E2: Supervisor requests rework', async () => {
    const token = await getToken('supervisor');

    const result = await requestRework(token, woId, 'Vibration still above acceptable levels. Check bearing alignment.');
    expect(result).toBeTruthy();

    // Server-state: WO should be back to in_progress
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('in_progress');

    // UI verification
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('in_progress', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // E3: Technician resumes and re-completes
  // ────────────────────────────────────────────────────────────────────
  test('E3: Technician re-completes after rework', async () => {
    const token = await getToken('tech_single');

    // Server-state: confirm WO is in_progress
    let fetched = await getWO(token, woId);
    expect(fetched.status).toBe('in_progress');

    // Log more time for the rework
    await logTime(token, woId, {
      action: 'start',
      manualHours: 2,
      notes: 'Bearing realigned and shimmed.',
    });

    // Complete again
    const completed = await completeWO(token, woId, 'Rework complete. Bearing realigned and shimmed. Vibration now 0.3mm/s.');
    expect(completed).toBeTruthy();

    // Server-state: completed again
    fetched = await getWO(token, woId);
    expect(fetched.status).toBe('completed');
    expect(fetched.actualHours).toBeGreaterThanOrEqual(5); // 3 + 2
  });

  // ────────────────────────────────────────────────────────────────────
  // E4: Supervisor verifies (second time)
  // ────────────────────────────────────────────────────────────────────
  test('E4: Supervisor verifies rework completion', async () => {
    const token = await getToken('supervisor');

    const result = await verifyWO(token, woId, 5);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('verified');
  });

  // ────────────────────────────────────────────────────────────────────
  // E5: Planner closes (after rework)
  // ────────────────────────────────────────────────────────────────────
  test('E5: Planner closes WO after rework', async () => {
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
});
