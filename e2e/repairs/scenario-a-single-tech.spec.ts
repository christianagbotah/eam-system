/**
 * Scenario A — Single Technician Full Lifecycle (UAT-01)
 *
 * Covers the COMPLETE WO journey from MR creation through closure:
 *   Requester → Supervisor → Planner → Technician → Storekeeper →
 *   Technician → Supervisor Verification → Planner Closeout → Reports
 *
 * Mutations go through API helpers (reliable, fast).
 * Browser verification at each major lifecycle stage proves UI reflects server state.
 * After each browser action, API GETs provide authoritative server-state assertion.
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
  getMR,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  lookupInventoryItemId,
  lookupToolIdByCode,
  expectFailure,
  apiCall,
  uploadAttachment,
} from './helpers/api';

test('UAT-01: Scenario A — Single-Tech Full Lifecycle', async ({ browser }) => {
  const context: BrowserContext = await browser.newContext();

  let mrId: string;
  let woId: string;
  let assetId: string;
  let plantId: string;
  let techSingleUserId: string;
  let toolRequestId: string;
  let materialRequestId: string;
  let reconciliationMaterialRequestId: string;

  try {
    const plannerToken = await getToken('planner');
    techSingleUserId = await lookupUserByKey(plannerToken, 'tech_single');
    assetId = await lookupAssetId(plannerToken, 'UAT-PUMP-001');
    plantId = await lookupPlantId(plannerToken, 'PLANT-A');

    // ──────────────────────────────────────────────────────────────────
    // A1: Requester creates MR (browser + API verification)
    // ──────────────────────────────────────────────────────────────────
    await test.step('A1: Requester creates Maintenance Request', async () => {
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

      // Server-state: MR is pending
      const fetched = await getMR(token, mrId);
      expect(fetched.status).toBe('pending');
    });

    // ──────────────────────────────────────────────────────────────────
    // A2: Supervisor approves MR (browser navigation + API verification)
    // ──────────────────────────────────────────────────────────────────
    await test.step('A2: Supervisor approves Maintenance Request', async () => {
      const token = await getToken('supervisor');

      const result = await approveMR(token, mrId);
      expect(result.status).toBe('approved');

      // Server-state verification
      const fetched = await getMR(token, mrId);
      expect(fetched.status).toBe('approved');
    });

    // ──────────────────────────────────────────────────────────────────
    // A3: Planner converts MR to WO and assigns technician
    // ──────────────────────────────────────────────────────────────────
    await test.step('A3: Planner converts MR to WO and assigns technician', async () => {
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

      // Server-state: WO assigned, MR converted
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('assigned');
      expect(fetched.assignedTo).toBe(techSingleUserId);

      const mr = await getMR(token, mrId);
      expect(mr.status).toBe('converted');
    });

    // ──────────────────────────────────────────────────────────────────
    // A4: Technician starts work (browser + API)
    // ──────────────────────────────────────────────────────────────────
    await test.step('A4: Technician starts work on WO', async () => {
      const token = await getToken('tech_single');

      await startWO(token, woId);

      // Server-state: in_progress with actualStart
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('in_progress');
      expect(fetched.actualStart).toBeTruthy();

      // Browser verification
      await authenticateAs(context, 'tech_single');
      const page = await context.newPage();
      await navigateToWODetail(page, woId);
      await expect(page.locator('body')).toContainText('in_progress', { timeout: 10_000 });
      await page.close();
    });

    // ──────────────────────────────────────────────────────────────────
    // A5: Technician logs time
    // ──────────────────────────────────────────────────────────────────
    await test.step('A5: Technician logs time on WO', async () => {
      const token = await getToken('tech_single');

      const timeLog = await logTime(token, woId, {
        action: 'start',
        manualHours: 2.5,
        notes: 'Disassembled pump casing, inspected bearings',
      });

      expect(timeLog).toBeTruthy();
      expect(timeLog.id).toBeTruthy();

      // Server-state: WO actualHours updated
      const fetched = await getWO(token, woId);
      expect(fetched.actualHours).toBeGreaterThanOrEqual(2.5);
    });

    // ──────────────────────────────────────────────────────────────────
    // A6: Technician requests material using seeded inventory item (storekeeper flow)
    // ──────────────────────────────────────────────────────────────────
    await test.step('A6: Technician requests material (real inventory item)', async () => {
      const techToken = await getToken('tech_single');
      const supToken = await getToken('supervisor');
      const storeToken = await getToken('storekeeper');

      // Look up the seeded inventory item ID for UAT-BRG-6205
      const bearingItemId = await lookupInventoryItemId(techToken, 'UAT-BRG-6205');
      expect(bearingItemId).toBeTruthy();

      // Create material request with real inventory item ID
      const { status: mrStatus, data: mrData } = await apiCall(
        techToken, 'POST', '/api/repairs/material-requests', {
          workOrderId: woId,
          itemId: bearingItemId,
          itemName: '6205-2RS Bearing',
          quantityRequested: 2,
          unit: 'each',
          urgency: 'normal',
          reason: 'Replacement bearings for pump overhaul',
        },
      );
      expect(mrStatus).toBe(201);
      materialRequestId = mrData.data.id;
      expect(materialRequestId).toBeTruthy();
      expect(mrData.data.itemId).toBe(bearingItemId);

      // Supervisor approves
      const { status: saStatus, data: saData } = await apiCall(
        supToken, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
          action: 'supervisor_approve',
        },
      );
      expect(saStatus).toBe(200);
      expect(saData.data.status).toBe('supervisor_approved');

      // Storekeeper approves
      const { status: skStatus, data: skData } = await apiCall(
        storeToken, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
          action: 'storekeeper_approve',
        },
      );
      expect(skStatus).toBe(200);
      expect(skData.data.status).toBe('storekeeper_approved');

      // Storekeeper issues
      const { status: isStatus, data: isData } = await apiCall(
        storeToken, 'POST', `/api/repairs/material-requests/${materialRequestId}`, {
          action: 'issue',
        },
      );
      expect(isStatus).toBe(200);
      expect(['issued', 'partially_issued']).toContain(isData.data.status);
    });

    // ──────────────────────────────────────────────────────────────────
    // A7: Technician requests tool using seeded non-calibration tool (storekeeper flow)
    // ──────────────────────────────────────────────────────────────────
    await test.step('A7: Technician requests and receives tool (real tool ID)', async () => {
      const techToken = await getToken('tech_single');
      const supToken = await getToken('supervisor');
      const storeToken = await getToken('storekeeper');

      // Look up the seeded non-calibration tool by toolCode
      const nonCalToolId = await lookupToolIdByCode(techToken, 'UAT-NON-CAL-TOOL');
      expect(nonCalToolId).toBeTruthy();

      // Create tool request with real tool ID
      const { status: trStatus, data: trData } = await apiCall(
        techToken, 'POST', '/api/repairs/tool-requests', {
          workOrderId: woId,
          reason: 'Need non-calibration hand tool for bearing installation',
          urgency: 'normal',
          items: [{ toolId: nonCalToolId, toolName: 'UAT-NON-CAL-TOOL', quantityRequested: 1 }],
        },
      );
      expect(trStatus).toBe(201);
      toolRequestId = trData.data.id;
      expect(toolRequestId).toBeTruthy();
      expect(trData.data.items[0].toolId).toBe(nonCalToolId);

      // Supervisor approves
      const { status: saStatus, data: saData } = await apiCall(
        supToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'supervisor_approve',
        },
      );
      expect(saStatus).toBe(200);

      // Storekeeper approves + issues
      const { status: skStatus } = await apiCall(
        storeToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'storekeeper_approve',
        },
      );
      expect(skStatus).toBe(200);

      const { status: isStatus, data: isData } = await apiCall(
        storeToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'issue',
          issuedItems: [{ itemId: trData.data.items[0].id, quantityIssued: 1 }],
        },
      );
      expect(isStatus).toBe(200);
      expect(isData.data.status).toBe('issued');
    });

    // ──────────────────────────────────────────────────────────────────
    // A8: Technician records measurement
    // ──────────────────────────────────────────────────────────────────
    await test.step('A8: Technician records measurement', async () => {
      const token = await getToken('tech_single');

      const { status, data } = await apiCall(
        token, 'POST', `/api/work-orders/${woId}/measurements`, {
          value: 0.45,
          unit: 'mm/s',
          measurementPoint: 'Bearing vibration (horizontal)',
        },
      );
      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Server-state: verify measurement exists
      const { data: measData } = await apiCall(
        token, 'GET', `/api/work-orders/${woId}/measurements`,
      );
      expect(measData.success).toBe(true);
      const readings = measData.data as Array<{ value: number; unit: string }>;
      expect(readings.length).toBeGreaterThanOrEqual(1);
    });

    // ──────────────────────────────────────────────────────────────────
    // A9: Material reconciliation — request 2 bearings, issue 2, return 1
    // ──────────────────────────────────────────────────────────────────
    await test.step('A9: Material reconciliation (request, issue, partial return)', async () => {
      const techToken = await getToken('tech_single');
      const supToken = await getToken('supervisor');
      const storeToken = await getToken('storekeeper');

      // 1. Request 2 bearings using the seeded item ID for 'UAT-BRG-6205'
      const bearingItemId = await lookupInventoryItemId(techToken, 'UAT-BRG-6205');
      expect(bearingItemId).toBeTruthy();

      const { status: mrStatus, data: mrData } = await apiCall(
        techToken, 'POST', '/api/repairs/material-requests', {
          workOrderId: woId,
          itemId: bearingItemId,
          itemName: '6205-2RS Bearing',
          quantityRequested: 2,
          unit: 'each',
          urgency: 'normal',
          reason: 'Material reconciliation test — request 2 bearings',
        },
      );
      expect(mrStatus).toBe(201);
      reconciliationMaterialRequestId = mrData.data.id;
      expect(reconciliationMaterialRequestId).toBeTruthy();
      expect(mrData.data.itemId).toBe(bearingItemId);

      // 2. Supervisor approves
      const { status: saStatus, data: saData } = await apiCall(
        supToken, 'POST', `/api/repairs/material-requests/${reconciliationMaterialRequestId}`, {
          action: 'supervisor_approve',
        },
      );
      expect(saStatus).toBe(200);
      expect(saData.data.status).toBe('supervisor_approved');

      // 3. Storekeeper approves
      const { status: skStatus, data: skData } = await apiCall(
        storeToken, 'POST', `/api/repairs/material-requests/${reconciliationMaterialRequestId}`, {
          action: 'storekeeper_approve',
        },
      );
      expect(skStatus).toBe(200);
      expect(skData.data.status).toBe('storekeeper_approved');

      // 4. Storekeeper issues 2
      const { status: isStatus, data: isData } = await apiCall(
        storeToken, 'POST', `/api/repairs/material-requests/${reconciliationMaterialRequestId}`, {
          action: 'issue',
          quantityApproved: 2,
        },
      );
      expect(isStatus).toBe(200);
      expect(isData.data.status).toBe('issued');
      expect(isData.data.quantityIssued).toBe(2);

      // 5. Storekeeper records return of 1 unused bearing (record_return action)
      const { status: retStatus, data: retData } = await apiCall(
        storeToken, 'POST', `/api/repairs/material-requests/${reconciliationMaterialRequestId}`, {
          action: 'record_return',
          quantityReturned: 1,
        },
      );
      expect(retStatus).toBe(200);
      expect(['partially_returned', 'fully_returned']).toContain(retData.data.status);

      // 6. Verify reconciliation quantities
      const { data: verifyData } = await apiCall(
        techToken, 'GET', `/api/repairs/material-requests/${reconciliationMaterialRequestId}`,
      );
      expect(verifyData.success).toBe(true);
      const reconciled = verifyData.data;
      expect(reconciled.quantityIssued).toBe(2);
      expect(reconciled.quantityReturned).toBe(1);
      // Effective consumed = issued - returned = 2 - 1 = 1
      expect(reconciled.quantityIssued - reconciled.quantityReturned).toBe(1);
      // 7. Verify status reflects partial return
      expect(['partially_returned', 'fully_returned']).toContain(reconciled.status);
    });

    // ──────────────────────────────────────────────────────────────────
    // A9.1: Technician returns tool
    // ──────────────────────────────────────────────────────────────────
    await test.step('A9.1: Technician returns tool', async () => {
      const techToken = await getToken('tech_single');
      const storeToken = await getToken('storekeeper');

      // Get the actual item ID
      const { data: trData } = await apiCall(
        techToken, 'GET', `/api/repairs/tool-requests/${toolRequestId}`,
      );
      const itemId = trData.data.items?.[0]?.id;
      expect(itemId).toBeTruthy();

      // Initiate return
      const { status: retStatus, data: retData } = await apiCall(
        techToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'return',
          returnedItems: [{ itemId, quantityReturned: 1, conditionAtReturn: 'good' }],
        },
      );
      expect(retStatus).toBe(200);
      expect(['pending_return', 'returned']).toContain(retData.data.status);

      // Storekeeper confirms return
      const { status: confStatus, data: confData } = await apiCall(
        storeToken, 'POST', `/api/repairs/tool-requests/${toolRequestId}`, {
          action: 'storekeeper_confirm_return',
        },
      );
      expect(confStatus).toBe(200);
      expect(confData.data.status).toBe('returned');
    });

    // ──────────────────────────────────────────────────────────────────
    // A9.5: Technician uploads evidence attachment while WO is in_progress
    // ──────────────────────────────────────────────────────────────────
    await test.step('A9.5: Technician uploads evidence attachment', async () => {
      const techToken = await getToken('tech_single');

      // Create a small test file (Buffer)
      const testContent = Buffer.from('UAT evidence file — bearing inspection photo placeholder');

      // Upload attachment
      const { status: upStatus, data: upData } = await uploadAttachment(
        techToken, woId, 'evidence-bearing-inspection.txt', testContent, 'text/plain',
      );
      expect([200, 201]).toContain(upStatus);
      expect(upData.success).toBe(true);

      // GET attachments and verify the uploaded file is linked to the WO
      const { status: getAttStatus, data: getAttData } = await apiCall(
        techToken, 'GET', `/api/work-orders/${woId}/attachments`,
      );
      expect(getAttStatus).toBe(200);
      expect(getAttData.success).toBe(true);
      const attachments = getAttData.data as Array<{ id?: string; fileName?: string };
      const found = attachments.find((a) => a.fileName === 'evidence-bearing-inspection.txt');
      expect(found).toBeTruthy();
    });

    // ──────────────────────────────────────────────────────────────────
    // A10: Technician completes WO
    // ──────────────────────────────────────────────────────────────────
    await test.step('A10: Technician completes WO', async () => {
      const token = await getToken('tech_single');

      await completeWO(token, woId, 'Bearing replaced. Vibration normalized to 0.5mm/s. All tools returned.');

      // Server-state: completed with labor cost
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('completed');
      expect(fetched.actualHours).toBeGreaterThanOrEqual(2.5);
      // Labor rate deterministic assertions — seeded as GHS 50/hr normal
      expect(fetched.laborRateApplied).toBe(50);
      expect(fetched.laborCurrency).toBe('GHS');

      // Browser verification
      await authenticateAs(context, 'tech_single');
      const page = await context.newPage();
      await navigateToWODetail(page, woId);
      await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });
      await page.close();
    });

    // ──────────────────────────────────────────────────────────────────
    // A11: Supervisor verifies WO
    // ──────────────────────────────────────────────────────────────────
    await test.step('A11: Supervisor verifies completed WO', async () => {
      const token = await getToken('supervisor');

      await verifyWO(token, woId, 4);

      // Server-state: verified
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('verified');
    });

    // ──────────────────────────────────────────────────────────────────
    // A12: Planner closes WO
    // ──────────────────────────────────────────────────────────────────
    await test.step('A12: Planner closes WO', async () => {
      const token = await getToken('planner');

      await closeWO(token, woId);

      // Server-state: closed and locked
      const fetched = await getWO(token, woId);
      expect(fetched.status).toBe('closed');
      expect(fetched.isLocked).toBe(true);
      // Labor rate snapshot should be preserved
      expect(fetched.laborCurrency).toBe('GHS');

      // Browser verification
      await authenticateAs(context, 'planner');
      const page = await context.newPage();
      await navigateToWODetail(page, woId);
      await expect(page.locator('body')).toContainText('closed', { timeout: 10_000 });
      await page.close();
    });

    // ──────────────────────────────────────────────────────────────────
    // A12.5: Upload rejected after WO is closed
    // ──────────────────────────────────────────────────────────────────
    await test.step('A12.5: Upload rejected after WO is closed', async () => {
      const techToken = await getToken('tech_single');

      const testContent = Buffer.from('This upload should be rejected because WO is closed');
      const { status: upStatus, data: upData } = await uploadAttachment(
        techToken, woId, 'post-close-reject.txt', testContent, 'text/plain',
      );
      expect([400, 403]).toContain(upStatus);
      expect(upData.success).toBe(false);
    });

    // ──────────────────────────────────────────────────────────────────
    // A13: Closed WO cannot be mutated
    // ──────────────────────────────────────────────────────────────────
    await test.step('A13: Closed WO cannot be restarted or modified', async () => {
      const techToken = await getToken('tech_single');

      // Cannot restart
      const { status: startStatus, data: startData } = await expectFailure(
        techToken, 'POST', `/api/work-orders/${woId}/start`,
      );
      expect(startStatus).toBeGreaterThanOrEqual(400);
      expect(startData.success).toBe(false);

      // Cannot add measurement
      const { status: measStatus, data: measData } = await expectFailure(
        techToken, 'POST', `/api/work-orders/${woId}/measurements`, {
          value: 99, unit: 'mm', measurementPoint: 'blocked',
        },
      );
      expect(measStatus).toBe(403);
      expect(measData.success).toBe(false);
    });

    // ──────────────────────────────────────────────────────────────────
    // A14: Download closed WO pack (PDF) — hardened binary assertions
    // ──────────────────────────────────────────────────────────────────
    await test.step('A14: Download closed WO pack (PDF)', async () => {
      const token = await getToken('planner');

      const res = await fetch(`http://localhost:3000/api/work-orders/${woId}/closed-pack`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 1. Status 200
      expect(res.status).toBe(200);
      // 2. Content-Type contains 'pdf'
      const contentType = res.headers.get('content-type') || '';
      expect(contentType.toLowerCase()).toContain('pdf');
      // 3. Content-Disposition header contains 'attachment'
      const contentDisposition = res.headers.get('content-disposition') || '';
      expect(contentDisposition.toLowerCase()).toContain('attachment');
      // 4. Response body is non-empty binary and starts with %PDF signature
      const bodyBuffer = Buffer.from(await res.arrayBuffer());
      expect(bodyBuffer.length).toBeGreaterThan(0);
      const pdfSignature = bodyBuffer.slice(0, 4).toString('utf-8');
      expect(pdfSignature).toBe('%PDF');
    });

    // ──────────────────────────────────────────────────────────────────
    // A15: Export WO data as XLSX — hardened binary assertions
    // ──────────────────────────────────────────────────────────────────
    await test.step('A15: Export WO data as XLSX', async () => {
      const token = await getToken('planner');

      const res = await fetch('http://localhost:3000/api/repairs/reports/xlsx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: 'xlsx',
          filters: { status: 'closed', plantId },
        }),
      });
      // 1. Status 200
      expect(res.status).toBe(200);
      // 2. Content-Type contains 'spreadsheet' or 'xlsx'
      const contentType = res.headers.get('content-type') || '';
      const ctLower = contentType.toLowerCase();
      expect(ctLower).toMatch(/spreadsheet|xlsx/);
      // 3. Content-Disposition header contains 'attachment'
      const contentDisposition = res.headers.get('content-disposition') || '';
      expect(contentDisposition.toLowerCase()).toContain('attachment');
      // 4. Response body is non-empty binary
      const bodyBuffer = Buffer.from(await res.arrayBuffer());
      expect(bodyBuffer.length).toBeGreaterThan(0);
      // 5. Verify XLSX magic bytes (PK zip signature 0x504B0304)
      const magicBytes = bodyBuffer.readUInt32BE(0);
      expect(magicBytes).toBe(0x504B0304);
    });
  } finally {
    await context.close();
  }
});
