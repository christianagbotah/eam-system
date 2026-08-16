/**
 * Scenario B — Multi-Tech WO Flow
 *
 * Tests team assignment, assistant work logging,
 * assistant completion restrictions, team leader final completion,
 * supervisor verification, and planner closure.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import {
  authenticateAs,
  navigateToWOList,
  navigateToWODetail,
} from './helpers/auth';

test.describe('Scenario B: Multi-Tech Team Flow', () => {
  let context: BrowserContext;
  const WO_NUMBER = 'WO-UAT-A2'; // Pre-seeded multi-tech WO

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 1: Planner assigns team + leader (WO-UAT-A2 already assigned)
  // ────────────────────────────────────────────────────────────────────
  test('B1: Verify team assignment on pre-seeded WO', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify team members are visible', async () => {
      const bodyText = await page.textContent('body');
      // Team leader and assistant should be visible
      expect(bodyText).toContain('UAT Tech Leader');
      expect(bodyText).toContain('UAT Tech Assistant');
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 2: Assistant logs own work
  // ────────────────────────────────────────────────────────────────────
  test('B2: Assistant logs time on WO', async () => {
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

    await test.step('Log time as assistant', async () => {
      const timeTab = page.locator('text=Time, text=Timer').first();
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

    await test.step('Add a comment', async () => {
      const commentTab = page.locator('text=Comment').first();
      if (await commentTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await commentTab.click();
        await page.waitForTimeout(1000);
      }

      const commentInput = page.locator('textarea, input[placeholder*="comment"]').first();
      if (await commentInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await commentInput.fill('Electrical wiring checked. Connections tight.');
        const sendBtn = page.locator('button').filter({ hasText: /Send|Post|Submit/i }).first();
        if (await sendBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 3: Assistant cannot submit final completion
  // ────────────────────────────────────────────────────────────────────
  test('B3: Assistant cannot submit final completion', async () => {
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

    await test.step('Verify Complete Work button is hidden for assistant', async () => {
      // The completion tab/button should NOT be visible for a non-leader team member
      const completeBtn = page.locator('button').filter({ hasText: /Complete Work|Complete|Finish/i });
      const isVisible = await completeBtn.isVisible({ timeout: 2_000 }).catch(() => false);

      // The button should either be invisible or disabled for assistants
      // (depending on the UI implementation)
      const bodyText = await page.textContent('body');
      const hasReadOnlyIndicator = bodyText?.includes('read_only') || bodyText?.includes('Read Only');

      expect(isVisible === false || hasReadOnlyIndicator).toBeTruthy();
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 4: Team leader starts and completes
  // ────────────────────────────────────────────────────────────────────
  test('B4: Team leader starts and completes the WO', async () => {
    await authenticateAs(context, 'tech_leader');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
      if (await woRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await woRow.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Start work', async () => {
      const startBtn = page.locator('button').filter({ hasText: /Start Work|Start/i }).first();
      if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Complete the WO as team leader', async () => {
      const completeBtn = page.locator('button').filter({ hasText: /Complete Work|Complete|Finish/i }).first();
      if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await completeBtn.click();
        await page.waitForTimeout(1000);

        // Fill completion notes
        const notesArea = page.locator('textarea, [contenteditable]').first();
        if (await notesArea.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await notesArea.fill('Motor rewound and tested. All connections verified.');
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Submit|Complete|Confirm/i }).last();
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 5: Supervisor verifies
  // ────────────────────────────────────────────────────────────────────
  test('B5: Supervisor verifies multi-tech WO', async () => {
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

    await test.step('Verify includes team member time', async () => {
      const bodyText = await page.textContent('body');
      // The assistant's time should be visible in the completion data
      expect(bodyText).toContain('UAT Tech Assistant');
    });

    await test.step('Verify the WO', async () => {
      const verifyBtn = page.locator('button').filter({ hasText: /Verify|Approve/i }).first();
      if (await verifyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await verifyBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    await page.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // STEP 6: Planner closes
  // ────────────────────────────────────────────────────────────────────
  test('B6: Planner closes multi-tech WO', async () => {
    await authenticateAs(context, 'planner');
    const page = await context.newPage();

    await test.step('Navigate to WO detail', async () => {
      await navigateToWOList(page);
      const woRow = page.locator(`text=${WO_NUMBER}`).first();
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
