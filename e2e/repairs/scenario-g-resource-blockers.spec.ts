/**
 * Scenario G — Resource Blocking/Reconciliation (UAT-07)
 *
 * Tests that outstanding tool requests block WO completion via
 * the readiness check, and that returning/reconciling tools
 * removes the blocker.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  getToken,
  createMR,
  approveMR,
  convertMR,
  assignWO,
  startWO,
  logTime,
  getWO,
  completeWO,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  apiCall,
  expectFailure,
} from './helpers/api';
import { authenticateAs, navigateToWODetail } from './helpers/auth';

test('UAT-07: Scenario G — Resource Blockers on Completion', async ({ browser }) => {
  const context: BrowserContext = await browser.newContext();

  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;
  let toolRequestId: string;

  try {
    // Pre-resolve IDs via API
    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');

    // ────────────────────────────────────────────────────────────────────
    // G1: Create WO, start it, create and fully issue a tool request
    // ────────────────────────────────────────────────────────────────────
    await test.step('G1: Create WO and issue tool request for it', async () => {
      const requesterToken = await getToken('requester');
      const supervisorToken = await getToken('supervisor');
      const planToken = await getToken('planner');
      const techToken = await getToken('tech_single');

      // Create MR → approve → convert → assign → start
      const mr = await createMR(requesterToken, {
        title: 'UAT-ResourceBlocker-Pump-Repair',
        description: 'Pump seal replacement requiring special tools.',
        assetId,
        priority: 'high',
        plantId,
      });

      await approveMR(supervisorToken, mr.id);
      const wo = await convertMR(planToken, mr.id, {
        assignedTo: techSingleUserId,
        tradeActivity: 'mechanical',
        workOrderType: 'corrective',
        priority: 'high',
      });
      woId = wo.id;
      expect(woId).toBeTruthy();

      await assignWO(planToken, woId, { assignedTo: techSingleUserId });
      await startWO(techToken, woId);

      const fetched = await getWO(techToken, woId);
      expect(fetched.status).toBe('in_progress');

      // Log time so the WO has some work recorded
      await logTime(techToken, woId, {
        action: 'start',
        manualHours: 1,
        notes: 'Started disassembly',
      });

      // Create a tool request (no linked tool — just a tool name)
      const { status: trStatus, data: trData } = await apiCall(
        techToken, 'POST', '/api/repairs/tool-requests', {
          workOrderId: woId,
          reason: 'Need a torque wrench for seal installation',
          urgency: 'normal',
          items: [{
            toolName: 'UAT Test Torque Wrench',
            quantityRequested: 1,
          }],
        },
      );
      expect(trStatus).toBe(201);
      expect(trData.success).toBe(true);
      toolRequestId = trData.data.id;
      expect(toolRequestId).toBeTruthy();

      // Supervisor approves
      const { status: saStatus, data: saData } = await apiCall(
        supervisorToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'supervisor_approve',
        },
      );
      expect(saStatus).toBe(200);
      expect(saData.data.status).toBe('supervisor_approved');

      // Storekeeper approves
      const storekeeperToken = await getToken('storekeeper');
      const { status: skStatus, data: skData } = await apiCall(
        storekeeperToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'storekeeper_approve',
        },
      );
      expect(skStatus).toBe(200);
      expect(skData.data.status).toBe('storekeeper_approved');

      // Issue the tool
      const { status: issueStatus, data: issueData } = await apiCall(
        storekeeperToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'issue',
          issuedItems: [{
            itemId: trData.data.items[0].id,
            quantityIssued: 1,
          }],
        },
      );
      expect(issueStatus).toBe(200);
      expect(issueData.data.status).toBe('issued');

      // Server-state: tool request is issued
      const { data: fetchedTR } = await apiCall(
        techToken, 'GET', `/api/repairs/tool-requests/${toolRequestId}`,
      );
      expect(fetchedTR.data.status).toBe('issued');
    });

    // ────────────────────────────────────────────────────────────────────
    // G2: Outstanding issued tools BLOCK completion
    // ────────────────────────────────────────────────────────────────────
    await test.step('G2: Outstanding issued tools block completion', async () => {
      const techToken = await getToken('tech_single');

      // Attempt completion via the repairs completion endpoint (runs readiness checks)
      const { status, data } = await expectFailure(
        techToken, 'POST', `/api/repairs/completion/${woId}`, {
          action: 'submit',
          completionNotes: 'Seal replaced.',
        },
      );

      // Should be blocked with 422 (readiness failure)
      expect(status).toBe(422);
      expect(data.success).toBe(false);
      // The blockers array should contain TOOLS_ISSUED
      expect(data.blockers).toBeDefined();
      const toolBlocker = data.blockers.find(
        (b: { code: string }) => b.code === 'TOOLS_ISSUED',
      );
      expect(toolBlocker).toBeDefined();
      expect(toolBlocker.code).toBe('TOOLS_ISSUED');

      // WO status should still be in_progress (completion was rejected)
      const fetched = await getWO(techToken, woId);
      expect(fetched.status).toBe('in_progress');
    });

    // ────────────────────────────────────────────────────────────────────
    // G3: Return tool → reconciliation removes blocker → completion succeeds
    // ────────────────────────────────────────────────────────────────────
    await test.step('G3: Return tools, then completion succeeds', async () => {
      const techToken = await getToken('tech_single');
      const storekeeperToken = await getToken('storekeeper');

      // Technician initiates return
      const { status: retStatus, data: retData } = await apiCall(
        techToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'return',
          returnedItems: [{
            itemId: toolRequestId, // placeholder — we'll use the correct item ID
            quantityReturned: 1,
            conditionAtReturn: 'good',
          }],
        },
      );

      // We need the actual item ID from the tool request
      const { data: trData } = await apiCall(
        techToken, 'GET', `/api/repairs/tool-requests/${toolRequestId}`,
      );
      const actualItemId = trData.data.items?.[0]?.id;

      if (actualItemId) {
        // Initiate return with correct item ID
        const { status: retStatus2, data: retData2 } = await apiCall(
          techToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
            action: 'return',
            returnedItems: [{
              itemId: actualItemId,
              quantityReturned: 1,
              conditionAtReturn: 'good',
            }],
          },
        );
        expect(retStatus2).toBe(200);
        expect(retData2.data.status).toBe('pending_return');

        // Storekeeper confirms return
        const { status: confirmStatus, data: confirmData } = await apiCall(
          storekeeperToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
            action: 'storekeeper_confirm_return',
          },
        );
        expect(confirmStatus).toBe(200);
        // After full return, status should be 'returned'
        expect(confirmData.data.status).toBe('returned');
      }

      // Now attempt completion again
      const { status, data } = await apiCall(
        techToken, 'POST', `/api/repairs/completion/${woId}`, {
          action: 'submit',
          completionNotes: 'Seal replaced. All tools returned.',
        },
      );

      // Should succeed now — no tool blocker
      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Server-state: WO should be 'completed'
      const fetched = await getWO(techToken, woId);
      expect(fetched.status).toBe('completed');

      // UI verification
      await authenticateAs(context, 'tech_single');
      const page = await context.newPage();
      await navigateToWODetail(page, woId);
      await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });
      await page.close();
    });
  } finally {
    await context.close();
  }
});
