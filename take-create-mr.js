const pw = require('playwright');
const path = require('path');
const CHR = '/home/z/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const browser = await pw.chromium.launch({ headless: true, executablePath: CHR, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const DIR = '/home/z/my-project/download/wo-screenshots';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Navigate to MR list
  console.log('Going to maintenance-requests...');
  await page.goto('http://localhost:3000/#/maintenance-requests', { waitUntil: 'load', timeout: 60000 });
  await sleep(4000); // Wait for compile

  // Try clicking Create button
  console.log('Looking for Create button...');
  const buttons = await page.$$('button');
  let clicked = false;
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text && /create|new request|add/i.test(text) && !/demo/i.test(text)) {
      console.log('Found button:', text.trim());
      await btn.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    // Try clicking button with plus icon near the page title
    console.log('Trying icon buttons...');
    const iconButtons = await page.$$('button svg, button[aria-label]');
    for (const btn of iconButtons) {
      const parent = btn.$('..');
      const parentText = await (await parent?.textContent()) || '';
      if (/create|new|add/i.test(parentText)) {
        await btn.click();
        clicked = true;
        break;
      }
    }
  }

  await sleep(2000);
  await page.screenshot({ path: path.join(DIR, '04-create-mr-dialog.png') });
  console.log('✅ 04-create-mr-dialog.png');

  await browser.close();
})().catch(e => console.error(e));