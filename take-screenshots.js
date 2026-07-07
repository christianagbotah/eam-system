const pw = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'download/wo-screenshots');
const URL = 'http://localhost:3000';
const CHR = '/home/z/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

fs.mkdirSync(DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitServer() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(URL); if (r.ok) { console.log(`Server ready (${i*2}s)`); return; } } catch {}
    await sleep(2000);
  }
  throw new Error('Server not ready');
}

async function main() {
  // Start dev server
  console.log('Starting dev server...');
  const srv = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: __dirname, stdio: ['ignore','pipe','pipe'],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  });
  srv.stdout.on('d', d => process.stdout.write(d));
  srv.stderr.on('d', d => process.stderr.write(d));

  await waitServer();
  await sleep(2000);

  // Launch browser
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHR, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  async function ss(name) {
    try {
      await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
      await sleep(1500);
      await page.screenshot({ path: path.join(DIR, name), fullPage: false });
      console.log(`  ✅ ${name}`);
    } catch (e) { console.error(`  ❌ ${name}: ${e.message.slice(0,80)}`); }
  }

  async function nav(hash) {
    const fullUrl = `${URL}/#/${hash}`;
    console.log(`  Navigating to ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await sleep(2000);
  }

  async function clickText(text) {
    try {
      const el = await page.$(`text=${text}`);
      if (el) { await el.click(); await sleep(1000); return true; }
    } catch {}
    return false;
  }

  // ===== SCREENSHOT 1: Login Page =====
  console.log('\n📸 1. Login Page');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await ss('01-login-page.png');

  // ===== LOGIN =====
  console.log('\n🔑 Logging in as admin...');
  // Username input: type="text", placeholder="Enter your username"
  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.fill('admin');
  // Password input
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill('admin123');
  await sleep(300);
  // Click Sign In button
  await page.locator('button:has-text("Sign In")').click();
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
  await sleep(3000);
  console.log('  Current URL:', page.url());

  // ===== SCREENSHOT 2: Dashboard =====
  console.log('\n📸 2. Dashboard');
  await ss('02-dashboard.png');

  // ===== SCREENSHOT 3: Maintenance Requests List =====
  console.log('\n📸 3. Maintenance Requests List');
  await nav('maintenance-requests');
  await ss('03-maintenance-requests-list.png');

  // ===== SCREENSHOT 4: Create MR Dialog =====
  console.log('\n📸 4. Create MR Dialog');
  try {
    const createBtn = page.locator('button:has-text("Create Request"), button:has-text("New Request"), button:has-text("+ New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await sleep(2000);
      await ss('04-create-mr-dialog.png');
      await page.keyboard.press('Escape');
      await sleep(500);
    } else {
      // Try any button with "Create" in it
      const anyCreate = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if (await anyCreate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyCreate.click();
        await sleep(2000);
        await ss('04-create-mr-dialog.png');
        await page.keyboard.press('Escape');
        await sleep(500);
      } else {
        console.log('  ⚠ No create button found');
      }
    }
  } catch (e) { console.log('  ⚠ Create MR error:', e.message.slice(0,80)); }

  // ===== SCREENSHOT 5: MR Detail =====
  console.log('\n📸 5. MR Detail');
  try {
    // Click first row/link in the table
    const firstRow = page.locator('tr:has(td)').first();
    const firstLink = page.locator('a[href*="mr-detail"], a[href*="maintenance-requests"]').first();
    if (await firstLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstLink.click();
    } else if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
    }
    await sleep(3000);
    await ss('05-mr-detail.png');
  } catch (e) { console.log('  ⚠ MR detail error:', e.message.slice(0,80)); }

  // ===== SCREENSHOT 6: Work Orders List =====
  console.log('\n📸 6. Work Orders List');
  await nav('maintenance-work-orders');
  await ss('06-work-orders-list.png');

  // ===== SCREENSHOT 7: WO Detail =====
  console.log('\n📸 7. WO Detail');
  try {
    const firstRow = page.locator('tr:has(td)').first();
    const firstLink = page.locator('a[href*="wo-detail"], a[href*="work-order"]').first();
    if (await firstLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstLink.click();
    } else if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
    }
    await sleep(3000);
    await ss('07-wo-detail.png');
  } catch (e) { console.log('  ⚠ WO detail error:', e.message.slice(0,80)); }

  // ===== SCREENSHOT 8: Tool Requests =====
  console.log('\n📸 8. Tool Requests');
  await nav('repairs-tool-requests');
  await ss('08-tool-requests.png');

  // ===== SCREENSHOT 9: Material Requests =====
  console.log('\n📸 9. Material Requests');
  await nav('repairs-material-requests');
  await ss('09-material-requests.png');

  // ===== SCREENSHOT 10: Tool Transfers =====
  console.log('\n📸 10. Tool Transfers');
  await nav('repairs-tool-transfers');
  await ss('10-tool-transfers.png');

  // ===== SCREENSHOT 11: Completion & Closure =====
  console.log('\n📸 11. Completion & Closure');
  await nav('repairs-completion');
  await ss('11-completion-closure.png');

  // ===== SCREENSHOT 12: Repair Analytics =====
  console.log('\n📸 12. Repair Analytics');
  await nav('repairs-analytics');
  await ss('12-repair-analytics.png');

  // ===== SCREENSHOT 13: Repair Reports =====
  console.log('\n📸 13. Repair Reports');
  await nav('repairs-reports');
  await ss('13-repair-reports.png');

  // ===== SCREENSHOT 14: Downtime Tracking =====
  console.log('\n📸 14. Downtime Tracking');
  await nav('repairs-downtime');
  await ss('14-downtime-tracking.png');

  // ===== SCREENSHOT 15: Spare Part Returns =====
  console.log('\n📸 15. Spare Part Returns');
  await nav('repairs-spare-part-returns');
  await ss('15-spare-part-returns.png');

  // ===== SCREENSHOT 16: Damaged Tool Reports =====
  console.log('\n📸 16. Damaged Tool Reports');
  await nav('repairs-damaged-tools');
  await ss('16-damaged-tool-reports.png');

  // ===== SCREENSHOT 17: Maintenance Dashboard =====
  console.log('\n📸 17. Maintenance Dashboard');
  await nav('maintenance-dashboard');
  await ss('17-maintenance-dashboard.png');

  console.log('\n🎉 All screenshots completed!');
  await browser.close();
  srv.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });