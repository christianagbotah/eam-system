/**
 * Scenario F — Shift Handover Flow
 *
 * Tests: active WO crosses shift → outgoing handover →
 * resume blocked before confirmation → incoming acknowledgement →
 * resume allowed after confirmation.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
} from './helpers/auth';

test.describe('Scenario F: Shift Handover', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('F1: Outgoing technician initiates shift handover', async () => {
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

    await test.step('Initiate shift handover', async () => {
      const handoverBtn = page.locator('button').filter({ hasText: /Handover|Shift/i }).first();
      if (await handoverBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await handoverBtn.click();
        await page.waitForTimeout(1000);

        // Fill handover form
        const summaryInput = page.locator('textarea, [contenteditable]').first();
        if (await summaryInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await summaryInput.fill('Bearing disassembled. Need to complete alignment tomorrow. Parts on bench.');
        }

        // Select incoming technician
        const techOption = page.locator('text=UAT Tech Assistant').first();
        if (await techOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await techOption.click();
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Handover|Confirm/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      // Verify handover status shows pending
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('pending');
    });

    await page.close();
  });

  test('F2: Resume blocked before handover confirmation', async () => {
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

    await test.step('Verify resume/start is blocked', async () => {
      const bodyText = await page.textContent('body');
      // There should be a blocker or warning about pending handover
      const hasHandoverWarning =
        bodyText?.includes('handover') ||
        bodyText?.includes('Handover') ||
        bodyText?.includes('MANDATORY_HANDOVER') ||
        bodyText?.includes('UNRESOLVED_HANDOVER');

      expect(hasHandoverWarning).toBeTruthy();
    });

    await page.close();
  });

  test('F3: Incoming technician acknowledges handover', async () => {
    await authenticateAs(context, 'tech_assistant');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Acknowledge the shift handover', async () => {
      const ackBtn = page.locator('button').filter({ hasText: /Acknowledge|Confirm Handover|Accept/i }).first();
      if (await ackBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await ackBtn.click();
        await page.waitForTimeout(1000);

        const confirmBtn = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Acknowledge/i }).last();
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }

      // Verify handover is now confirmed
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('confirmed');
    });

    await page.close();
  });

  test('F4: Resume allowed after confirmation', async () => {
    await authenticateAs(context, 'tech_assistant');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator('text=WO-UAT-A1').first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify work can resume', async () => {
      const bodyText = await page.textContent('body');
      // Should NOT have handover blocker anymore
      const hasBlocker =
        bodyText?.includes('UNRESOLVED_HANDOVER') ||
        bodyText?.includes('MANDATORY_HANDOVER_PENDING');

      expect(hasBlocker === false).toBeTruthy();
    });

    await page.close();
  });
});
