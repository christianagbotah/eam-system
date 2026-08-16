/**
 * Scenario E — Rework Flow
 *
 * Tests: complete WO → supervisor requests rework →
 * execution resumes → second completion → verified and closed.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
} from './helpers/auth';

test.describe('Scenario E: Rework Flow', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('E1: Technician completes the WO (first time)', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Start work if needed', async () => {
      const startBtn = page.locator('button').filter({ hasText: /Start Work|Start/i }).first();
      if (await startBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Complete the WO', async () => {
      const completeBtn = page.locator('button').filter({ hasText: /Complete Work|Complete|Finish/i }).first();
      if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        const notesArea = page.locator('textarea, [contenteditable]').first();
        if (await notesArea.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await notesArea.fill('Initial completion. Bearing replaced.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Complete|Confirm/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });

  test('E2: Supervisor requests rework', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Request rework instead of verify', async () => {
      const reworkBtn = page.locator('button').filter({ hasText: /Rework|Request Rework/i }).first();
      if (await reworkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reworkBtn.click();
        await page.waitForTimeout(1000);

        // Fill rework reason
        const reasonInput = page.locator('textarea, input[placeholder*="reason"]').first();
        if (await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await reasonInput.fill('Vibration still above acceptable levels. Check bearing alignment.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Confirm|Rework/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      // Verify WO went back to in_progress
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('in_progress');
    });

    await page.close();
  });

  test('E3: Technician resumes and re-completes', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify WO is back in in_progress', async () => {
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('in_progress');
    });

    await test.step('Complete the WO again (second attempt)', async () => {
      const completeBtn = page.locator('button').filter({ hasText: /Complete Work|Complete|Finish/i }).first();
      if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        const notesArea = page.locator('textarea, [contenteditable]').first();
        if (await notesArea.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await notesArea.fill('Rework complete. Bearing realigned and shimmed. Vibration now 0.3mm/s.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Complete|Confirm/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });

  test('E4: Supervisor verifies (second time)', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify the rework completion', async () => {
      const verifyBtn = page.locator('button').filter({ hasText: /Verify|Approve/i }).first();
      if (await verifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await verifyBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });

  test('E5: Planner closes (after rework)', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Close the WO', async () => {
      const closeBtn = page.locator('button').filter({ hasText: /Close/i }).first();
      if (await closeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);

        const confirmBtn = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Close/i }).last();
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });
});
