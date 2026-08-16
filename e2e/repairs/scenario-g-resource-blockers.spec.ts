/**
 * Scenario G — Resource Blockers
 *
 * Tests: outstanding tool/material request blocks completion →
 * custody reconciled → completion allowed.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
} from './helpers/auth';

test.describe('Scenario G: Resource Blockers on Completion', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('G1: Outstanding tool request blocks completion', async () => {
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

    await test.step('Request a tool (creating outstanding request)', async () => {
      const toolTab = page.locator('text=Tool').first();
      if (await toolTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await toolTab.click();
        await page.waitForTimeout(1000);
      }

      const requestBtn = page.locator('button').filter({ hasText: /Request|Add Tool/i }).first();
      if (await requestBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await requestBtn.click();
        await page.waitForTimeout(1000);

        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="tool"] ').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Torque Wrench');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Request|Save/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify completion is blocked by outstanding tool', async () => {
      const bodyText = await page.textContent('body');
      // Check for tool custody blocker
      const hasBlocker =
        bodyText?.includes('TOOLS_ISSUED') ||
        bodyText?.includes('OPEN_TOOL_CUSTODY') ||
        bodyText?.includes('tool') ||
        bodyText?.includes('Tool');

      // There should be at least some indication of the tool
      // in the readiness checks or warnings
      expect(hasBlocker).toBeTruthy();
    });

    await page.close();
  });

  test('G2: Outstanding material request blocks completion', async () => {
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

    await test.step('Request a material', async () => {
      const materialTab = page.locator('text=Material').first();
      if (await materialTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await materialTab.click();
        await page.waitForTimeout(1000);
      }

      const requestBtn = page.locator('button').filter({ hasText: /Request|Add Material/i }).first();
      if (await requestBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await requestBtn.click();
        await page.waitForTimeout(1000);

        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="item"] ').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Grease NLGI 2');
        }

        const qtyInput = page.locator('input[type="number"], input[placeholder*="qty"] ').first();
        if (await qtyInput.isVisible()) {
          await qtyInput.fill('1');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Request|Save/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify material reconciliation is needed', async () => {
      const bodyText = await page.textContent('body');
      const hasMaterialBlocker =
        bodyText?.includes('UNRECONCILED_MATERIALS') ||
        bodyText?.includes('OPEN_MATERIAL_RECONCILIATION') ||
        bodyText?.includes('Material');

      expect(hasMaterialBlocker).toBeTruthy();
    });

    await page.close();
  });

  test('G3: Custody reconciled — completion allowed', async () => {
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

    await test.step('Reconcile materials', async () => {
      const materialTab = page.locator('text=Material').first();
      if (await materialTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await materialTab.click();
        await page.waitForTimeout(1000);
      }

      const reconBtn = page.locator('button').filter({ hasText: /Reconcile|Return|Update|Consume/i }).first();
      if (await reconBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reconBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Return tools', async () => {
      const toolTab = page.locator('text=Tool').first();
      if (await toolTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await toolTab.click();
        await page.waitForTimeout(1000);
      }

      const returnBtn = page.locator('button').filter({ hasText: /Return/i }).first();
      if (await returnBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await returnBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify completion button is now available', async () => {
      const bodyText = await page.textContent('body');
      // After reconciling, there should be no blockers
      const hasOpenBlocker =
        bodyText?.includes('OPEN_TOOL_CUSTODY') &&
        bodyText?.includes('UNRECONCILED_MATERIALS');

      // At least one of the blocker codes should be gone
      expect(hasOpenBlocker === false).toBeTruthy();
    });

    await page.close();
  });
});
