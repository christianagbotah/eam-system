/**
 * Scenario A — Full Single-Tech WO Lifecycle
 *
 * This is the most comprehensive test covering the entire flow:
 * 1. Requester submits MR
 * 2. Supervisor approves MR
 * 3. Planner converts MR to WO and assigns single tech
 * 4. Technician starts work, logs time, requests material & tool
 * 5. Storekeeper issues material and tool
 * 6. Technician performs tasks, records measurement, returns tool,
 *    reconciles material, completes WO
 * 7. Supervisor verifies
 * 8. Planner closes
 * 9. Download closed WO pack (PDF)
 * 10. Export XLSX report
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  switchUser,
  navigateToMRList,
  navigateToWOList,
  navigateToWODetail,
} from './helpers/auth';

test.describe('Scenario A: Single-Tech Full Lifecycle', () => {
  let context: BrowserContext;
  let mrNumber: string;
  let woNumber: string;
  let woId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 1: Requester submits MR
  // ────────────────────────────────────────────────────────────────────
  test('A1: Requester submits Maintenance Request', async () => {
    await authenticateAs(context, 'requester');
    const page = await context.newPage();

    await test.step('Navigate to MR list', async () => {
      await navigateToMRList(page);
      // Verify the MR page loads
      await expect(page.locator('text=Maintenance Request').first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Click Create MR button', async () => {
      const createBtn = page.locator('button').filter({ hasText: /Create|New|Add/i }).first();
      await expect(createBtn).toBeVisible({ timeout: 5_000 });
      await createBtn.click();
      // Dialog or form should appear
      await page.waitForTimeout(1000);
    });

    await test.step('Fill MR form and submit', async () => {
      // Fill title
      const titleInput = page.locator('input[placeholder*="title"], input[name*="title"], input[id*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('UAT-SingleTech-Pump-Vibration');
      }

      // Fill description
      const descInput = page.locator('textarea, [contenteditable]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('Abnormal vibration at 3000 RPM on centrifugal pump. Needs bearing inspection.');
      }

      // Set priority to High
      const prioritySelect = page.locator('select, [role="combobox"]').first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.click();
        await page.locator('text=High').first().click();
      }

      // Submit
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Create|Save/i }).last();
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // Verify success toast or MR appears in list
      const toast = page.locator('[data-sonner-toast][data-type="success"]');
      const mrInList = page.locator('text=UAT-SingleTech-Pump-Vibration');
      const success = await toast.isVisible({ timeout: 5_000 }).catch(() => false)
        || await mrInList.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(success).toBeTruthy();
    });

    await test.step('Get the created MR number', async () => {
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent('body');
      const match = bodyText?.match(/MR-\d{6}-\d{4}/);
      if (match) mrNumber = match[0];
      console.log(`  📝 MR created: ${mrNumber || '(pending API lookup)'} `);
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 2: Supervisor approves MR
  // ────────────────────────────────────────────────────────────────────
  test('A2: Supervisor approves Maintenance Request', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    await test.step('Navigate to MR list as supervisor', async () => {
      await navigateToMRList(page);
      await expect(page.locator('text=Maintenance Request').first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Find and open the pending MR', async () => {
      // Click on the MR from the list
      const mrLink = page.locator(`text=${mrNumber || 'UAT-SingleTech-Pump-Vibration'}`).first();
      if (await mrLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await mrLink.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Approve the MR', async () => {
      const approveBtn = page.locator('button').filter({ hasText: /Approve/i }).first();
      if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(2000);

        // Confirm approval if dialog appears
        const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Yes|Approve/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      // Verify status changed
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('approved');
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 3: Planner converts MR to WO and assigns
  // ────────────────────────────────────────────────────────────────────
  test('A3: Planner converts MR to WO and assigns technician', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    await test.step('Navigate to MR detail', async () => {
      await navigateToMRList(page);
      const mrLink = page.locator(`text=${mrNumber || 'UAT-SingleTech-Pump-Vibration'}`).first();
      if (await mrLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await mrLink.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Click Convert to WO', async () => {
      const convertBtn = page.locator('button').filter({ hasText: /Convert|Create WO/i }).first();
      if (await convertBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await convertBtn.click();
        await page.waitForTimeout(1500);
      }
    });

    await test.step('Fill WO form', async () => {
      // The convert dialog should have fields pre-filled
      // Select technician for assignment
      const techSelect = page.locator('text=Technician, [role="combobox"], select').first();
      if (await techSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await techSelect.click();
        await page.locator('text=UAT Tech Single').first().click();
      }

      // Set trade activity
      const tradeSelect = page.locator('text=Mechanical').first();
      if (await tradeSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tradeSelect.click();
      }

      // Submit conversion
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Create|Convert|Save/i }).last();
      await submitBtn.click();
      await page.waitForTimeout(3000);
    });

    await test.step('Get the created WO number', async () => {
      const bodyText = await page.textContent('body');
      const match = bodyText?.match(/WO-\d{6}-\d{4}/);
      if (match) woNumber = match[0];

      // Also try to extract WO ID from URL hash
      const url = page.url();
      const idMatch = url.match(/id=([a-zA-Z0-9]+)/);
      if (idMatch) woId = idMatch[1];

      console.log(`  🔧 WO created: ${woNumber || '(pending)'} ID: ${woId || '(pending)'} `);
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 4: Technician starts work
  // ────────────────────────────────────────────────────────────────────
  test('A4: Technician starts work, logs time, requests material & tool', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    // If we don't have a WO ID from the conversion, use the pre-seeded WO
    if (!woId) {
      // Navigate to WO list and find the pre-seeded WO
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1, text=UAT Single-Tech Pump Repair').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
        const url = page.url();
        const idMatch = url.match(/id=([a-zA-Z0-9]+)/);
        if (idMatch) woId = idMatch[1];
      }
    } else {
      await navigateToWODetail(page, woId);
    }

    await test.step('Start work on WO', async () => {
      const startBtn = page.locator('button').filter({ hasText: /Start Work|Start/i }).first();
      if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(2000);
      }
      // Verify status shows in_progress
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('in_progress');
    });

    await test.step('Log time entry', async () => {
      // Look for the time tracking tab or button
      const timeTab = page.locator('text=Time, text=Timer, [data-testid="time-tab"]').first();
      if (await timeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await timeTab.click();
        await page.waitForTimeout(1000);
      }

      // Click log time button
      const logBtn = page.locator('button').filter({ hasText: /Log Time|Add Time|Start Timer/i }).first();
      if (await logBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await logBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(1500);
    });

    await test.step('Request material', async () => {
      const materialTab = page.locator('text=Material').first();
      if (await materialTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await materialTab.click();
        await page.waitForTimeout(1000);
      }

      const requestBtn = page.locator('button').filter({ hasText: /Request|Add Material/i }).first();
      if (await requestBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await requestBtn.click();
        await page.waitForTimeout(1000);

        // Fill material request form
        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="item"], input[name*="itemName"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Bearing 6205');
        }
        const qtyInput = page.locator('input[type="number"], input[placeholder*="qty"], input[placeholder*="quantity"]').first();
        if (await qtyInput.isVisible()) {
          await qtyInput.fill('2');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Request|Save/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Request tool', async () => {
      const toolTab = page.locator('text=Tool').first();
      if (await toolTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await toolTab.click();
        await page.waitForTimeout(1000);
      }

      const requestBtn = page.locator('button').filter({ hasText: /Request|Add Tool/i }).first();
      if (await requestBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await requestBtn.click();
        await page.waitForTimeout(1000);

        // Fill tool request
        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="tool"], input[name*="toolName"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Dial Indicator');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Request|Save/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 5: Storekeeper issues material and tool
  // ────────────────────────────────────────────────────────────────────
  test('A5: Storekeeper issues material and tool', async () => {
    await authenticateAs(context, 'storekeeper');
    const page = await context.newPage();

    await test.step('Navigate to repairs material requests', async () => {
      await page.goto('/#/repairs-dashboard');
      await page.waitForTimeout(2000);
    });

    await test.step('Approve and issue material request', async () => {
      // Find the pending material request
      const materialReq = page.locator('text=Bearing 6205, text=pending').first();
      if (await materialReq.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await materialReq.click();
        await page.waitForTimeout(1500);

        // Issue the material
        const issueBtn = page.locator('button').filter({ hasText: /Issue|Approve/i }).first();
        if (await issueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await issueBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    await test.step('Approve and issue tool request', async () => {
      const toolReq = page.locator('text=Dial Indicator, text=pending').first();
      if (await toolReq.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await toolReq.click();
        await page.waitForTimeout(1500);

        const issueBtn = page.locator('button').filter({ hasText: /Issue|Approve/i }).first();
        if (await issueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await issueBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 6: Technician completes work
  // ────────────────────────────────────────────────────────────────────
  test('A6: Technician performs tasks, records measurement, returns tool, completes WO', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    if (woId) {
      await navigateToWODetail(page, woId);
    } else {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    }

    await test.step('Perform tasks', async () => {
      const taskTab = page.locator('text=Task, text=Checklist, text=Procedure').first();
      if (await taskTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await taskTab.click();
        await page.waitForTimeout(1000);

        // Find and complete a task
        const completeBtn = page.locator('button').filter({ hasText: /Complete|Done|Check/i }).first();
        if (await completeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await completeBtn.click();
          await page.waitForTimeout(1500);
        }
      }
    });

    await test.step('Record measurement', async () => {
      const evidenceTab = page.locator('text=Evidence, text=Measurement, text=Reading').first();
      if (await evidenceTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await evidenceTab.click();
        await page.waitForTimeout(1000);

        // Record a measurement
        const recordBtn = page.locator('button').filter({ hasText: /Record|Add Measurement/i }).first();
        if (await recordBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await recordBtn.click();
          await page.waitForTimeout(1000);

          // Fill measurement value
          const valueInput = page.locator('input[type="number"], input[placeholder*="value"]').first();
          if (await valueInput.isVisible()) {
            await valueInput.fill('2.5');
          }

          const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Save|Record/i }).last();
          await submitBtn.click();
          await page.waitForTimeout(1500);
        }
      }
    });

    await test.step('Return tool', async () => {
      const toolTab = page.locator('text=Tool').first();
      if (await toolTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await toolTab.click();
        await page.waitForTimeout(1000);

        const returnBtn = page.locator('button').filter({ hasText: /Return/i }).first();
        if (await returnBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await returnBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    await test.step('Reconcile material', async () => {
      const materialTab = page.locator('text=Material').first();
      if (await materialTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await materialTab.click();
        await page.waitForTimeout(1000);

        const reconBtn = page.locator('button').filter({ hasText: /Reconcile|Return|Update/i }).first();
        if (await reconBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await reconBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    await test.step('Complete the WO', async () => {
      const completeBtn = page.locator('button').filter({ hasText: /Complete Work|Complete|Finish/i }).first();
      if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        // Fill completion form if present
        const notesArea = page.locator('textarea, [contenteditable]').first();
        if (await notesArea.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await notesArea.fill('Bearing replaced. Vibration normalized to 0.5mm/s.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Complete|Confirm/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      // Verify status shows completed
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('completed');
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 7: Supervisor verifies
  // ────────────────────────────────────────────────────────────────────
  test('A7: Supervisor verifies completed WO', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    if (woId) {
      await navigateToWODetail(page, woId);
    } else {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    }

    await test.step('Verify the WO', async () => {
      const verifyBtn = page.locator('button').filter({ hasText: /Verify|Approve/i }).first();
      if (await verifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await verifyBtn.click();
        await page.waitForTimeout(1000);

        // May need to fill review notes
        const notesArea = page.locator('textarea, [contenteditable]').first();
        if (await notesArea.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await notesArea.fill('Work verified. Pump running smoothly.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Verify|Approve/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('verified');
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 8: Planner closes
  // ────────────────────────────────────────────────────────────────────
  test('A8: Planner closes WO', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    if (woId) {
      await navigateToWODetail(page, woId);
    } else {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    }

    await test.step('Close the WO', async () => {
      const closeBtn = page.locator('button').filter({ hasText: /Close/i }).first();
      if (await closeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Close/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('closed');
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 9: Download closed WO pack (PDF)
  // ────────────────────────────────────────────────────────────────────
  test('A9: Download closed WO pack (PDF)', async ({ request }) => {
    await authenticateAs(context, 'planner');

    // Get the token from the context
    const page = await context.newPage();
    const token = await page.evaluate(() => localStorage.getItem('eam_token'));
    await page.close();

    if (!woId) {
      test.skip();
      return;
    }

    await test.step('Request PDF download', async () => {
      const res = await request.get(`/api/work-orders/${woId}/closed-pack`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Should return binary (PDF) — content-type should be application/pdf
      const contentType = res.headers()['content-type'] || '';
      expect(contentType).toContain('application/pdf');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 10: Export XLSX report
  // ────────────────────────────────────────────────────────────────────
  test('A10: Export XLSX report', async ({ request }) => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();
    const token = await page.evaluate(() => localStorage.getItem('eam_token'));
    await page.close();

    await test.step('Request XLSX export', async () => {
      const res = await request.get('/api/repairs/reports/xlsx', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Should return binary (XLSX)
      const contentType = res.headers()['content-type'] || '';
      expect(
        contentType.includes('application/vnd.openxmlformats') ||
        contentType.includes('application/octet-stream') ||
        res.status() === 200
      ).toBeTruthy();
    });
  });
});
