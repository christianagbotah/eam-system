/**
 * Scenario C — Supervisor Delegation Assignment Flow
 *
 * Tests the delegation pattern where the planner assigns the WO to
 * the supervisor (via_supervisor), who then assigns the technician.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import { authenticateAs, navigateToWODetail } from './helpers/auth';
import {
  getToken,
  createMR,
  approveMR,
  convertMR,
  assignWO,
  startWO,
  getWO,
  getMR,
  getCapabilities,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
} from './helpers/api';

test('UAT-03: Scenario C — Supervisor Delegation Flow', async ({ browser }) => {
  const context: BrowserContext = await browser.newContext();

  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let supervisorUserId: string;
  let techSingleUserId: string;

  try {
    // Pre-resolve IDs via API
    const plannerToken = await getToken('planner');
    supervisorUserId = await lookupUserByKey(plannerToken, 'supervisor');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');

    // ────────────────────────────────────────────────────────────────────
    // C1: Planner creates MR, approves, converts with via_supervisor
    // ────────────────────────────────────────────────────────────────────
    await test.step('C1: Planner delegates WO to supervisor via via_supervisor assignment', async () => {
      const reqToken = await getToken('requester');
      const mr = await createMR(reqToken, {
        title: 'UAT-SupervisorDelegation-Valve-Repair',
        description: 'Control valve not opening fully. Needs on-site inspection and repair.',
        assetId,
        priority: 'high',
        plantId,
      });
      mrId = mr.id;
      expect(mrId).toBeTruthy();

      // Server-state: MR pending
      let fetched = await getMR(reqToken, mrId);
      expect(fetched.status).toBe('pending');

      // Supervisor approves
      const supToken = await getToken('supervisor');
      const approved = await approveMR(supToken, mrId);
      expect(approved.status).toBe('approved');

      fetched = await getMR(supToken, mrId);
      expect(fetched.status).toBe('approved');

      // Planner converts with via_supervisor assignment (no tech assigned yet)
      const planToken = await getToken('planner');
      const wo = await convertMR(planToken, mrId, {
        assignmentType: 'via_supervisor',
        assignedSupervisorId: supervisorUserId,
        tradeActivity: 'mechanical',
        workOrderType: 'corrective',
      });

      woId = wo.id;
      expect(woId).toBeTruthy();

      // Server-state: WO is 'approved' (no tech assigned directly)
      const fetchedWO = await getWO(planToken, woId);
      expect(fetchedWO.status).toBe('approved');
      expect(fetchedWO.assignedSupervisorId).toBe(supervisorUserId);
      expect(fetchedWO.assignmentType).toBe('via_supervisor');
    });

    // ────────────────────────────────────────────────────────────────────
    // C2: Supervisor assigns technician
    // ────────────────────────────────────────────────────────────────────
    await test.step('C2: Supervisor assigns technician to delegated WO', async () => {
      const token = await getToken('supervisor');

      const result = await assignWO(token, woId, {
        assignedTo: techSingleUserId,
        assignmentType: 'direct',
      });

      expect(result).toBeTruthy();

      // Server-state verification
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('assigned');
      expect(fetched.assignedTo).toBe(techSingleUserId);
    });

    // ────────────────────────────────────────────────────────────────────
    // C3: Technician can start the WO
    // ────────────────────────────────────────────────────────────────────
    await test.step('C3: Technician can start the supervisor-assigned WO', async () => {
      const token = await getToken('tech_single');

      // Verify capabilities
      const caps = await getCapabilities(token, woId);
      expect(caps.canStart).toBe(true);

      // Start work
      const result = await startWO(token, woId);
      expect(result).toBeTruthy();

      // Server-state verification
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('in_progress');

      // UI verification
      await authenticateAs(context, 'tech_single');
      const page = await context.newPage();
      await navigateToWODetail(page, woId);
      await expect(page.locator('body')).toContainText('in_progress', { timeout: 10_000 });
      await page.close();
    });
  } finally {
    await context.close();
  }
});
