/**
 * Scenario D — Assistance Request Flow
 *
 * Tests: technician requests help → supervisor/planner approves →
 * helper joins and logs time → helper appears in team members.
 *
 * Uses the API for assistance request creation and approval.
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
  getWO,
  requestAssistance,
  approveAssistanceRequest,
  getTeamMemberRequests,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
} from './helpers/api';

test.describe('Scenario D: Assistance Request Flow', () => {
  let context: BrowserContext;

  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;
  let techAssistantUserId: string;
  let assistanceReqId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    techAssistantUserId = await lookupUserByKey(plannerToken, 'tech_assistant');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // D1: Create WO and start it (prerequisite for assistance)
  // ────────────────────────────────────────────────────────────────────
  test('D1: Create and start WO for assistance scenario', async () => {
    const reqToken = await getToken('requester');
    const mr = await createMR(reqToken, {
      title: 'UAT-Assistance-Pump-Wiring',
      description: 'Pump wiring needs electrical expertise. Mechanical work done.',
      assetId,
      priority: 'high',
      plantId,
    });
    mrId = mr.id;
    expect(mrId).toBeTruthy();

    const supToken = await getToken('supervisor');
    await approveMR(supToken, mrId);

    const planToken = await getToken('planner');
    const wo = await convertMR(planToken, mrId, {
      assignedTo: techSingleUserId,
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
    });
    woId = wo.id;
    expect(woId).toBeTruthy();

    // Start the WO
    const techToken = await getToken('tech_single');
    await startWO(techToken, woId);

    const fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('in_progress');
  });

  // ────────────────────────────────────────────────────────────────────
  // D2: Technician requests assistance (specific user)
  // ────────────────────────────────────────────────────────────────────
  test('D2: Technician requests assistance for electrical expertise', async () => {
    const token = await getToken('tech_single');

    const req = await requestAssistance(token, woId, {
      requestedUserId: techAssistantUserId,
      reason: 'Need electrical expertise for motor wiring check',
      role: 'assistant',
    });

    assistanceReqId = req.id;
    expect(assistanceReqId).toBeTruthy();
    expect(req.status).toBe('pending');

    // Server-state: request exists and is pending
    const requests = await getTeamMemberRequests(token, woId);
    const found = requests.find((r: { id: string }) => r.id === assistanceReqId);
    expect(found).toBeTruthy();
    expect(found.status).toBe('pending');
  });

  // ────────────────────────────────────────────────────────────────────
  // D3: Planner approves assistance request
  // ────────────────────────────────────────────────────────────────────
  test('D3: Planner approves assistance and assigns assistant', async () => {
    const token = await getToken('planner');

    const result = await approveAssistanceRequest(
      token,
      woId,
      assistanceReqId,
      techAssistantUserId,
    );

    expect(result).toBeTruthy();
    expect(result.status).toBe('approved');

    // Server-state: WO should now have the assistant as team member
    const fetched = await getWO(token, woId);
    const teamMemberIds = (fetched.teamMembers || []).map((m: { userId: string }) => m.userId);
    expect(teamMemberIds).toContain(techAssistantUserId);
  });

  // ────────────────────────────────────────────────────────────────────
  // D4: Helper joins and logs time
  // ────────────────────────────────────────────────────────────────────
  test('D4: Assistant logs time on the WO', async () => {
    const token = await getToken('tech_assistant');

    const timeLog = await logTime(token, woId, {
      action: 'start',
      manualHours: 1.5,
      notes: 'Electrical wiring checked. Connections tight.',
    });

    expect(timeLog).toBeTruthy();
    expect(timeLog.id).toBeTruthy();

    // Server-state: WO actual hours should include assistant time
    const fetched = await getWO(token, woId);
    expect(fetched.actualHours).toBeGreaterThanOrEqual(1.5);
  });

  // ────────────────────────────────────────────────────────────────────
  // D5: Verify assistant appears in team on UI
  // ────────────────────────────────────────────────────────────────────
  test('D5: UI shows assistant as team member', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);

    // The assistant's name should appear on the page
    await expect(page.locator('body')).toContainText('UAT Tech Assistant', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // D6: Complete and close the WO
  // ────────────────────────────────────────────────────────────────────
  test('D6: Complete, verify, and close WO after assistance', async () => {
    const techToken = await getToken('tech_single');
    await completeWO(techToken, woId, 'Pump wiring complete. All checks passed.');

    let fetched = await getWO(techToken, woId);
    expect(fetched.status).toBe('completed');

    const supToken = await getToken('supervisor');
    await verifyWO(supToken, woId, 4);

    fetched = await getWO(supToken, woId);
    expect(fetched.status).toBe('verified');

    const planToken = await getToken('planner');
    await closeWO(planToken, woId);

    fetched = await getWO(planToken, woId);
    expect(fetched.status).toBe('closed');
    expect(fetched.isLocked).toBe(true);
  });
});
