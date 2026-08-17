/**
 * Scenario A — Full Browser Journey UAT (UAT-01-BROWSER)
 *
 * This is a TRUE browser-based critical journey test that complements the API-based
 * scenario-a-single-tech.spec.ts. While the API test validates server logic in
 * isolation, THIS test validates the complete MR → WO lifecycle through actual
 * browser clicks, form fills, and UI interactions.
 *
 * Flow:
 *   B1: Requester creates MR via browser form
 *   B2: Supervisor approves MR via browser sheet
 *   B3: Planner converts MR to WO via browser dialog
 *   B4: Technician starts WO via browser Actions dropdown
 *   B5: Technician completes WO via browser completion form
 *   B6: Supervisor verifies WO via browser Actions dropdown
 *   B7: Planner closes WO via browser Actions dropdown
 *
 * After each browser action, an API GET verifies the authoritative server state.
 * Uses `fullyParallel: false` safe pattern — no shared mutable state across tests.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  authenticateAs,
  navigateToMRList,
  navigateToWOList,
  navigateToWODetail,
} from './helpers/auth';
import {
  getToken,
  getMR,
  getWO,
  lookupUserByKey,
  lookupAssetId,
  lookupPlantId,
  apiCall,
} from './helpers/api';

// ── Unique identifiers to avoid collisions with other tests ─────────────
const MR_TITLE = 'UAT-Browser-Journey Pump Vibration';
const MR_DESC = 'Abnormal vibration at 3000 RPM on centrifugal pump. Needs bearing inspection. (Browser journey test)';
const COMPLETION_NOTES = 'Bearing replaced successfully. Vibration normalized to 0.5mm/s. All tools returned to store.';
const ROOT_CAUSE = 'Worn 6205-2RS bearing due to extended run hours beyond PM interval.';
const FINDINGS = 'Inner race showed pitting. Grease was degraded and contaminated with metal particles.';
const CORRECTIVE_ACTION = 'Bearing replaced with new 6205-2RS. Grease replenished. Recommended PM interval review.';

// ── Helper: open a new authenticated page ────────────────────────────────
async function openPage(context: BrowserContext, userKey: string): Promise<Page> {
  await authenticateAs(context, userKey);
  const page = await context.newPage();
  await page.goto('/');
  // Wait for the SPA shell to render
  await page.waitForSelector('[data-sidebar], nav, main', { timeout: 15_000 });
  return page;
}

// ── Helper: find a label's sibling combobox within the same container ────
async function selectOption(page: Page, labelText: string, optionText: string): Promise<void> {
  // Locate the label, then find the nearest ancestor container with a combobox
  const label = page.locator('label').filter({ hasText: new RegExp(`^${labelText}$`) }).first();
  const container = label.locator('xpath=ancestor::div[contains(@class, "space-y")]').first();
  await container.getByRole('combobox').click();
  await page.getByRole('option', { name: optionText }).click();
}

// ── Helper: wait for a response to an API endpoint ───────────────────────
async function waitForApiResponse(
  page: Page,
  method: string,
  urlPattern: RegExp,
): Promise<void> {
  await page.waitForResponse(
    (resp) => resp.request().method() === method && urlPattern.test(resp.url()),
    { timeout: 15_000 },
  );
}

test('UAT-01-BROWSER: Scenario A — Full Browser Journey (UI clicks + API verification)', async ({ browser }) => {
  const context: BrowserContext = await browser.newContext();
  let mrId: string;
  let woId: string;

  try {
    // ── Pre-step: resolve reference data via API ─────────────────────────
    const preToken = await getToken('planner');
    const assetId = await lookupAssetId(preToken, 'UAT-PUMP-001');
    const plantId = await lookupPlantId(preToken, 'PLANT-A');
    const techUserId = await lookupUserByKey(preToken, 'tech_single');
    expect(assetId).toBeTruthy();
    expect(plantId).toBeTruthy();
    expect(techUserId).toBeTruthy();

    // =====================================================================
    // B1: Requester creates MR via BROWSER
    // =====================================================================
    await test.step('B1: Requester creates MR via browser', async () => {
      const token = await getToken('requester');
      const page = await openPage(context, 'requester');
      try {
        await navigateToMRList(page);

        // Click "New Request" button to open the create dialog
        await page.getByRole('button', { name: /New Request/ }).click();
        // Wait for the dialog to render
        await page.getByPlaceholder('Brief description of the issue').waitFor({ state: 'visible', timeout: 10_000 });

        // Fill Title (required)
        await page.getByPlaceholder('Brief description of the issue').fill(MR_TITLE);

        // Fill Description
        await page.getByPlaceholder('Detailed description').fill(MR_DESC);

        // Item Type: "Select Machine" is the default, no action needed

        // Select Asset via AsyncSearchableSelect combobox
        const assetCombobox = page.locator('button[role="combobox"]').filter({ hasText: 'Select machine' });
        await assetCombobox.click();
        // Wait for async options to load (API fetch)
        await page.waitForTimeout(1_500);
        // Type in the search input to filter
        await page.getByPlaceholder('Search machines by name or tag').fill('UAT-PUMP-001');
        await page.waitForTimeout(500);
        // Click the matching option
        await page.getByRole('option', { name: /UAT-PUMP-001/ }).click();

        // Select Priority = High
        await selectOption(page, 'Priority', 'High');

        // Submit the form
        const submitPromise = waitForApiResponse(page, 'POST', /\/api\/maintenance-requests$/);
        await page.getByRole('button', { name: /Submit Request/ }).click();
        await submitPromise;

        // Wait for the dialog to close and list to refresh
        await page.waitForTimeout(1_000);

        // Verify the MR appears in the list
        await expect(page.locator('body')).toContainText(MR_TITLE, { timeout: 10_000 });

        // ── API verification: MR exists on the server ──
        const { data: searchData } = await apiCall(token, 'GET', `/api/maintenance-requests?search=${encodeURIComponent(MR_TITLE)}`);
        const requests = searchData.data as Array<{ id: string; status: string; requestNumber: string }>;
        const created = requests.find((r) => r.title === MR_TITLE);
        expect(created).toBeTruthy();
        mrId = created.id;
        expect(mrId).toBeTruthy();
        expect(created.status).toBe('pending');
        expect(created.requestNumber).toMatch(/^MR-\d{6}-\d{4}$/);
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B2: Supervisor approves MR via BROWSER
    // =====================================================================
    await test.step('B2: Supervisor approves MR via browser', async () => {
      const token = await getToken('supervisor');
      const page = await openPage(context, 'supervisor');
      try {
        await navigateToMRList(page);

        // Find the MR row by title and click to open detail sheet
        await page.locator('table tbody tr').filter({ hasText: MR_TITLE }).click();
        // Wait for the detail sheet to render (approve button visible)
        await page.getByRole('button', { name: /Approve/ }).waitFor({ state: 'visible', timeout: 10_000 });

        // Click Approve button
        await page.getByRole('button', { name: /Approve/ }).click();

        // Confirm in the AlertDialog
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
        const approvePromise = waitForApiResponse(page, 'POST', /\/approve$/);
        await page.getByRole('button', { name: /Yes, Approve/ }).click();
        await approvePromise;

        // Wait for UI to update
        await page.waitForTimeout(1_000);

        // Verify status changed in the UI (status badge should show "approved")
        await expect(page.locator('body')).toContainText('approved', { timeout: 10_000 });

        // ── API verification ──
        const fetched = await getMR(token, mrId);
        expect(fetched.status).toBe('approved');
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B3: Planner converts MR to WO via BROWSER
    // =====================================================================
    await test.step('B3: Planner converts MR to WO', async () => {
      const token = await getToken('planner');
      const page = await openPage(context, 'planner');
      try {
        await navigateToMRList(page);

        // Find the MR row and click to open detail sheet
        await page.locator('table tbody tr').filter({ hasText: MR_TITLE }).click();
        // Wait for the detail sheet
        await page.getByRole('button', { name: /Convert to WO/ }).waitFor({ state: 'visible', timeout: 10_000 });

        // Click "Convert to WO" to open the convert dialog
        await page.getByRole('button', { name: /Convert to WO/ }).click();

        // Wait for the convert dialog to render with its sections
        await page.getByText('Request Information').waitFor({ state: 'visible', timeout: 10_000 });
        await page.getByText('Work Order Details').waitFor({ state: 'visible', timeout: 10_000 });
        await page.getByText('Resource Assignment').waitFor({ state: 'visible', timeout: 10_000 });

        // The WO details are pre-filled from the MR (type=corrective, priority=high, trade=mechanical)
        // We need to assign a technician via the WorkerAssignmentSelector

        // Search for the technician in the worker table
        const workerSearch = page.getByPlaceholder(/Search by name, staff ID/);
        await workerSearch.waitFor({ state: 'visible', timeout: 10_000 });
        await workerSearch.fill('uat_tech_single');
        // Wait for the debounced search (300ms) + API fetch
        await page.waitForTimeout(1_500);

        // Click the worker row or checkbox to select the technician
        const workerRow = page.locator('table tbody tr').filter({ hasText: /uat_tech_single/ }).first();
        await workerRow.click();

        // Verify the technician is selected (summary bar appears)
        await expect(page.getByText(/1 worker selected/)).toBeVisible({ timeout: 5_000 });

        // Click "Create Work Order" to submit
        const convertPromise = waitForApiResponse(page, 'POST', /\/convert$/);
        await page.getByRole('button', { name: /Create Work Order/ }).click();
        await convertPromise;

        // Wait for the dialog to close
        await page.waitForTimeout(2_000);

        // ── API verification: MR is converted, WO is created ──
        const fetchedMR = await getMR(token, mrId);
        expect(fetchedMR.status).toBe('converted');
        expect(fetchedMR.workOrderId).toBeTruthy();
        woId = fetchedMR.workOrderId;

        const fetchedWO = await getWO(token, woId);
        expect(fetchedWO.status).toBe('assigned');
        expect(fetchedWO.woNumber).toMatch(/^WO-\d{6}-\d{4}$/);
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B4: Technician starts WO via BROWSER
    // =====================================================================
    await test.step('B4: Technician starts work via browser', async () => {
      const token = await getToken('tech_single');
      const page = await openPage(context, 'tech_single');
      try {
        await navigateToWODetail(page, woId);

        // Click the "Actions" dropdown button
        await page.getByRole('button', { name: /Actions/ }).click();

        // Click "In Progress" menu item (the transition from assigned → in_progress)
        await page.getByRole('menuitem', { name: /In Progress/ }).click();

        // Confirm in the AlertDialog: "Yes, Start Work"
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
        const startPromise = waitForApiResponse(page, 'POST', /\/start$/);
        await page.getByRole('button', { name: /Yes, Start Work/ }).click();
        await startPromise;

        // Wait for UI to update
        await page.waitForTimeout(1_000);

        // Verify status in the UI
        await expect(page.locator('body')).toContainText('in_progress', { timeout: 10_000 });

        // ── API verification ──
        const fetched = await getWO(token, woId);
        expect(fetched.status).toBe('in_progress');
        expect(fetched.actualStart).toBeTruthy();
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B5: Technician submits completion via BROWSER
    // =====================================================================
    await test.step('B5: Technician submits completion', async () => {
      const token = await getToken('tech_single');
      const page = await openPage(context, 'tech_single');
      try {
        await navigateToWODetail(page, woId);

        // Scroll to the action grid area and click "Complete WO" button
        const completeBtn = page.getByRole('button', { name: /Complete WO/ });
        await completeBtn.scrollIntoViewIfNeeded();
        await completeBtn.click();

        // Wait for the completion dialog to render
        await page.getByPlaceholder('What was done?').waitFor({ state: 'visible', timeout: 10_000 });

        // Fill completion notes (required field)
        await page.getByPlaceholder('What was done?').fill(COMPLETION_NOTES);

        // Fill failure analysis fields (optional but good practice)
        await page.getByPlaceholder(/What caused the failure/).fill(ROOT_CAUSE);
        await page.getByPlaceholder(/What was discovered/).fill(FINDINGS);
        await page.getByPlaceholder(/Actions taken to prevent/).fill(CORRECTIVE_ACTION);

        // Click "Mark as Completed"
        const completePromise = waitForApiResponse(page, 'POST', /\/complete$/);
        await page.getByRole('button', { name: /Mark as Completed/ }).click();
        await completePromise;

        // Wait for UI to update
        await page.waitForTimeout(1_500);

        // Verify status in the UI
        await expect(page.locator('body')).toContainText('completed', { timeout: 10_000 });

        // ── API verification ──
        const fetched = await getWO(token, woId);
        expect(fetched.status).toBe('completed');
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B6: Supervisor verifies WO via BROWSER
    // =====================================================================
    await test.step('B6: Supervisor verifies completion', async () => {
      const token = await getToken('supervisor');
      const page = await openPage(context, 'supervisor');
      try {
        await navigateToWODetail(page, woId);

        // Click the "Actions" dropdown
        await page.getByRole('button', { name: /Actions/ }).click();

        // Click "Verified" menu item
        await page.getByRole('menuitem', { name: /Verified/ }).click();

        // Confirm: "Yes, Verify"
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
        const verifyPromise = waitForApiResponse(page, 'POST', /\/verify$/);
        await page.getByRole('button', { name: /Yes, Verify/ }).click();
        await verifyPromise;

        // Wait for UI to update
        await page.waitForTimeout(1_000);

        // Verify status in the UI
        await expect(page.locator('body')).toContainText('verified', { timeout: 10_000 });

        // ── API verification ──
        const fetched = await getWO(token, woId);
        expect(fetched.status).toBe('verified');
      } finally {
        await page.close();
      }
    });

    // =====================================================================
    // B7: Planner closes WO via BROWSER
    // =====================================================================
    await test.step('B7: Planner closes WO', async () => {
      const token = await getToken('planner');
      const page = await openPage(context, 'planner');
      try {
        await navigateToWODetail(page, woId);

        // Click the "Actions" dropdown
        await page.getByRole('button', { name: /Actions/ }).click();

        // Click "Closed" menu item
        await page.getByRole('menuitem', { name: /Closed/ }).click();

        // Confirm: "Yes, Close" (destructive variant)
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
        const closePromise = waitForApiResponse(page, 'POST', /\/close$/);
        await page.getByRole('button', { name: /Yes, Close/ }).click();
        await closePromise;

        // Wait for UI to update
        await page.waitForTimeout(1_000);

        // Verify status in the UI
        await expect(page.locator('body')).toContainText('closed', { timeout: 10_000 });

        // ── API verification ──
        const fetched = await getWO(token, woId);
        expect(fetched.status).toBe('closed');
        expect(fetched.isLocked).toBe(true);
      } finally {
        await page.close();
      }
    });
  } finally {
    await context.close();
  }
});
