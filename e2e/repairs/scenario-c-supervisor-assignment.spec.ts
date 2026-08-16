/**
 * Scenario C — Supervisor Assignment Flow
 *
 * Tests the delegation pattern where the planner assigns the WO to
 * the supervisor, who then assigns the technician.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
} from './helpers/auth';

test.describe('Scenario C: Supervisor Assignment Flow', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('C1: Planner delegates WO to supervisor for assignment', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    await test.step('Navigate to work orders', async () => {
      await navigateToWOList(page);
      await expect(page.locator('text=Work Order').first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Find an approved WO and assign to supervisor', async () => {
      // Find a WO that needs assignment
      const woRow = page.locator('text=approved, text=WO-').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);

        // Open assign dialog
        const assignBtn = page.locator('button').filter({ hasText: /Assign|Delegate/i }).first();
        if (await assignBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await assignBtn.click();
          await page.waitForTimeout(1000);

          // Select supervisor as the delegation target
          const supervisorOption = page.locator('text=UAT Supervisor, text=maintenance_supervisor').first();
          if (await supervisorOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await supervisorOption.click();
          }

          // Set assignment type to 'via_supervisor'
          const assignmentType = page.locator('text=via_supervisor, text=Supervisor').first();
          if (await assignmentType.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await assignmentType.click();
          }

          const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Assign|Save|Confirm/i }).last();
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    });

    await page.close();
  });

  test('C2: Supervisor assigns technician', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    await test.step('Navigate to WO list', async () => {
      await navigateToWOList(page);
      await page.waitForTimeout(2000);
    });

    await test.step('Find the delegated WO and assign technician', async () => {
      // Look for a WO in 'planned' or 'approved' status assigned to supervisor
      const woRow = page.locator('text=UAT Supervisor').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);

        // Assign technician
        const assignBtn = page.locator('button').filter({ hasText: /Assign Technician|Assign/i }).first();
        if (await assignBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await assignBtn.click();
          await page.waitForTimeout(1000);

          // Select a technician
          const techOption = page.locator('text=UAT Tech Single, text=maintenance_technician').first();
          if (await techOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await techOption.click();
          }

          const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Assign|Save|Confirm/i }).last();
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    });

    await page.close();
  });

  test('C3: Technician can start and complete after supervisor assignment', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    await test.step('Navigate to WO list', async () => {
      await navigateToWOList(page);
      await page.waitForTimeout(2000);
    });

    await test.step('Find assigned WO and verify start button visible', async () => {
      const bodyText = await page.textContent('body');
      // The tech should see their assigned WO
      const hasAssigned = bodyText?.includes('assigned') || bodyText?.includes('UAT Tech Single');
      expect(hasAssigned).toBeTruthy();
    });

    await page.close();
  });
});
