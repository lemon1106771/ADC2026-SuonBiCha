// Optional real Chromium verification. Set PLAYWRIGHT_MODULE to an installed playwright package.
// A temporary extension copy exposes its shadow root only for test selectors.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdtemp, cp, readFile, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { once } = require('node:events');
(async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'neo-browser-'));
  const extension = path.join(directory, 'extension');
  await cp(path.join(__dirname, '../neo-extension'), extension, { recursive: true });
  const content = await readFile(path.join(extension, 'content.js'), 'utf8');
  await writeFile(path.join(extension, 'content.js'), content.replace("attachShadow({ mode: 'closed' })", "attachShadow({ mode: 'open' })"));
  let context, workplace, ai;
  try {
    const { createWorkplaceServer } = await import('../server/workplace.mjs');
    const { createNeoServer } = await import('../server/server.mjs');
    workplace = createWorkplaceServer(); workplace.listen(0, '127.0.0.1'); await once(workplace, 'listening');
    const url = `http://127.0.0.1:${workplace.address().port}`;
    context = await chromium.launchPersistentContext(path.join(directory, 'profile'), { headless: true, channel: 'chromium', args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 1440, height: 1050 } });
    let [worker] = context.serviceWorkers(); if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const requests = [];
    ai = createNeoServer({ apiKey: 'test-only', extensionId, fetchImpl: async (providerUrl, config) => {
      const body = JSON.parse(config.body); requests.push(body);
      const structured = body.text?.format;
      const reply = structured ? JSON.stringify({ reply: 'Review the suggested next steps.', steps: ['Confirm the review time with Alex', 'Group the customer observations'], draft: '' }) : 'The review time and priority are not specified. Ask Alex to confirm.';
      return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: reply }] }] }) };
    } });
    ai.listen(4318, '127.0.0.1'); await once(ai, 'listening');
    await worker.evaluate(() => chrome.storage.local.set({ neoSettings: { aiEnabled: true, proactive: false, followCursor: true } }));
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url); await page.locator('#neo-companion-root').waitFor();
    await page.screenshot({ path: path.join(directory, 'workplace.png'), fullPage: true });
    await page.mouse.move(570, 360);
    await page.waitForFunction(() => document.querySelector('#neo-companion-root').shadowRoot.querySelector('#mascot').style.left === '594px');
    const mascot = page.locator('#neo-companion-root #mascot');
    await mascot.click(); await page.locator('#neo-companion-root #panel').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#neo-companion-root #pane-chat').isVisible(), true);
    await page.locator('#neo-companion-root #close').click();
    await page.locator('#select-message').click();
    // The toolbar command is the actual worker -> content-script route.
    await worker.evaluate(async () => { const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); await chrome.tabs.sendMessage(tab.id, { type: 'neo:summon' }); });
    await page.locator('#neo-companion-root #attach').click();
    await page.locator('#neo-companion-root [data-mode=steps]').click();
    await page.locator('#neo-companion-root #chat-send').click();
    await page.locator('#neo-companion-root #workflow-result textarea').first().waitFor();
    assert.match(requests[0].input.at(-1).content, /customer notes/);
    await page.locator('#neo-companion-root #workflow-result textarea').first().fill('Confirm the exact review time');
    await page.locator('#neo-companion-root #workflow-result button').click();
    await page.locator('#neo-companion-root #plan-list textarea').first().waitFor();
    await page.locator('#neo-companion-root #plan-list button').filter({ hasText: 'Do this next' }).first().click();
    await page.screenshot({ path: path.join(directory, 'companion-plan.png') });
    await page.reload(); await page.locator('#neo-companion-root #mascot').click(); await page.locator('#neo-companion-root #tab-plan').click();
    assert.equal(await page.locator('#neo-companion-root #plan-list textarea').first().inputValue(), 'Confirm the exact review time');
    await page.locator('#neo-companion-root #tab-chat').click(); await page.locator('#neo-companion-root #focus').click();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#neo-companion-root #highlight').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(directory, 'workplace-narrow.png'), fullPage: true });
    const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.locator('summary').filter({ hasText: 'Make Neo work for you' }).click();
    await popup.locator('#format').selectOption('example');
    await popup.screenshot({ path: path.join(directory, 'preferences.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, directory, provider: 'mocked; real extension, worker, HTTP proxy and Chromium UI exercised', requests: requests.length }));
  } finally {
    await context?.close();
    for (const server of [ai, workplace]) if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    // Keep screenshots for visual review; the profile and extension copy are disposable.
    for (const name of ['profile', 'extension']) {
      const target = path.resolve(directory, name);
      if (path.dirname(target) !== path.resolve(directory) || !path.basename(directory).startsWith('neo-browser-')) throw new Error('Unexpected test cleanup path');
      await rm(target, { recursive: true, force: true });
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
