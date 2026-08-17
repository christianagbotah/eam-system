/**
 * Scenario B — Multi-Technician WO Flow
 *
 * Tests team assignment with leader + assistant,
 * capability checks (only leader can complete),
 * assistant completion restriction, and full lifecycle.
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
  completeWO,
  verifyWO,
  closeWO,
  getWO,
  getMR,
  getCapabilities,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  expectFailure,
} from './helpers/api';

test.describe('Scenario B: Multi-Tech Team Flow', () => {
  let context: BrowserContext;

  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techLeaderUserId: string;
  let techAssistantUserId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    const plannerToken = await getToken('planner');
    techLeaderUserId = await lookupUserByKey(plannerToken, 'tech_leader');
    techAssistantUserId = await lookupUserByKey(plannerToken, 'tech_assistant');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // B1: Create MR, approve, convert with team assignment
  // ────────────────────────────────────────────────────────────────────
  test('B1: Create MR, approve, convert with multi-tech team', async () => {
    // Requester creates MR
    const reqToken = await getToken('requester');
    const mr = await createMR(reqToken, {
      title: 'UAT-MultiTech-Motor-Overhaul',
      description: 'Motor running hot, high current draw. Needs mechanical and electrical inspection.',
      assetId,
      priority: 'medium',
      plantId,
    });
    mrId = mr.id;
    expect(mrId).toBeTruthy();

    // Server-state: MR is pending
    let fetched = await getMR(reqToken, mrId);
    expect(fetched.status).toBe('pending');

    // Supervisor approves
    const supToken = await getToken('supervisor');
    const approved = await approveMR(supToken, mrId);
    expect(approved.status).toBe('approved');

    fetched = await getMR(supToken, mrId);
    expect(fetched.status).toBe('approved');

    // Planner converts with team
    const planToken = await getToken('planner');
    const wo = await convertMR(planToken, mrId, {
      assignedTo: techLeaderUserId,
      teamLeaderId: techLeaderUserId,
      teamMembers: [
        { userId: techLeaderUserId, role: 'team_leader' },
        { userId: techAssistantUserId, role: 'assistant' },
      ],
      tradeActivity: 'mechanical',
      workOrderType: 'corrective',
    });

    woId = wo.id;
    expect(woId).toBeTruthy();

    // Server-state: WO assigned, team members present
    const fetchedWO = await getWO(planToken, woId);
    expect(fetchedWO.status).toBe('assigned');
    expect(fetchedWO.assignedTo).toBe(techLeaderUserId);
    expect(fetchedWO.teamLeaderId).toBe(techLeaderUserId);
  });

  // ────────────────────────────────────────────────────────────────────
  // B2: Check capabilities — only leader has canSubmitCompletion
  // ────────────────────────────────────────────────────────────────────
  test('B2: Only team leader has canSubmitCompletion capability', async () => {
    // Start WO first
    const leaderToken = await getToken('tech_leader');
    await startWO(leaderToken, woId);

    // Check leader capabilities
    const leaderCaps = await getCapabilities(leaderToken, woId);
    expect(leaderCaps.canSubmitCompletion).toBe(true);
    expect(leaderCaps.isTeamLeader).toBe(true);

    // Check assistant capabilities
    const assistToken = await getToken('tech_assistant');
    const assistCaps = await getCapabilities(assistToken, woId);
    expect(assistCaps.canSubmitCompletion).toBe(false);
    expect(assistCaps.isTeamMember).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────
  // B3: Assistant cannot submit final completion
  // ────────────────────────────────────────────────────────────────────
  test('B3: Assistant cannot submit final completion', async () => {
    const token = await getToken('tech_assistant');

    const { status, data } = await expectFailure(token, 'POST', `/api/work-orders/${woId}/complete`, {
      notes: 'Should not work',
    });

    // Should fail — either 403 (permissions) or 400/422 (not allowed)
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // B4: Team leader completes the WO
  // ────────────────────────────────────────────────────────────────────
  test('B4: Team leader completes the WO', async () => {
    const token = await getToken('tech_leader');

    const result = await completeWO(token, woId, 'Motor rewound and tested. All connections verified.');
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('completed');

    // UI verification
    await authenticateAs(context, 'tech_leader');
    const page = await context.newPage();
    await navigateToWODetail(page, woId);
    await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });
    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // B5: Supervisor verifies
  // ────────────────────────────────────────────────────────────────────
  test('B5: Supervisor verifies multi-tech WO', async () => {
    const token = await getToken('supervisor');

    const result = await verifyWO(token, woId, 5);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('verified');
  });

  // ────────────────────────────────────────────────────────────────────
  // B6: Planner closes
  // ────────────────────────────────────────────────────────────────────
  test('B6: Planner closes multi-tech WO', async () => {
    const token = await getToken('planner');

    const result = await closeWO(token, woId);
    expect(result).toBeTruthy();

    // Server-state verification
    const fetched = await getWO(token, woId);
    expect(fetched.status).toBe('closed');
    expect(fetched.isLocked).toBe(true);
  });
});
