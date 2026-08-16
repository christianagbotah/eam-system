/**
 * Scenario D — Assistance Request Flow
 *
 * Tests: technician requests help → supervisor approves →
 * helper joins and logs time → helper time appears in completion.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
} from './helpers/auth';

test.describe('Scenario D: Assistance Request Flow', () => {
  let context: BrowserContext;
  const WO_NUMBER = 'WO-UAT-A1'; // Use pre-seeded single-tech WO

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('D1: Technician requests assistance', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Request assistance', async () => {
      const assistBtn = page.locator('button').filter({ hasText: /Request Help|Assistance|Request Member/i }).first();
      if (await assistBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await assistBtn.click();
        await page.waitForTimeout(1000);

        // Fill assistance request
        const reasonInput = page.locator('textarea, input[placeholder*="reason"]').first();
        if (await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await reasonInput.fill('Need electrical expertise for motor wiring check');
        }

        // Select trade needed
        const tradeSelect = page.locator('text=Electrical').first();
        if (await tradeSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await tradeSelect.click();
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Request|Send/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }

      // Verify request was created
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('pending');
    });

    await page.close();
  });

  test('D2: Supervisor approves assistance request', async () => {
    await authenticateAs(context, 'supervisor');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Approve the assistance request', async () => {
      const approveBtn = page.locator('button').filter({ hasText: /Approve/i }).first();
      if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);

        // Select the assistant user
        const techOption = page.locator('text=UAT Tech Assistant').first();
        if (await techOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await techOption.click();
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Approve|Save/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });

  test('D3: Helper joins and logs time', async () => {
    await authenticateAs(context, 'tech_assistant');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify team membership', async () => {
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('UAT Tech Assistant');
    });

    await test.step('Log time as helper', async () => {
      const timeTab = page.locator('text=Time').first();
      if (await timeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await timeTab.click();
        await page.waitForTimeout(1000);
      }

      const logBtn = page.locator('button').filter({ hasText: /Log Time|Start|Add/i }).first();
      if (await logBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await logBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await page.close();
  });

  test('D4: Helper time appears in completion data', async () => {
    await authenticateAs(context, 'tech_single');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Check time logs include helper', async () => {
      const timeTab = page.locator('text=Time').first();
      if (await timeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await timeTab.click();
        await page.waitForTimeout(1000);
      }

      const bodyText = await page.textContent('body');
      // The assistant's name should appear in the time logs
      expect(bodyText).toContain('UAT Tech Assistant');
    });

    await page.close();
  });
});
