const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../neo-extension');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function companion(options = {}) {
  const dom = new JSDOM('<!doctype html><body><p id="work">First sentence. Second sentence.</p><p id="other">Another task</p><input id="name"><input id="secret" type="password"></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.com' });
  const w = dom.window, d = w.document;
  let root, now = 1000, hidden = false, focused = true, intervals = new Map(), nextId = 0;
  let settings = { demoMode: true, ...options.settings }, task = options.task || null, checkpoints = [], activeId = null, captureWasHidden = false;
  const messages = [], messageListeners = new Set(), storageListeners = new Set();
  const work = background(options.workStorage || { local: {}, session: {} });
  const attach = w.Element.prototype.attachShadow;
  w.Element.prototype.attachShadow = function (args) { root = attach.call(this, args); return root; };
  w.Date.now = () => now; w.setInterval = fn => { intervals.set(++nextId, fn); return nextId; }; w.clearInterval = id => intervals.delete(id);
  w.requestAnimationFrame = fn => { fn(); return 0; }; w.cancelAnimationFrame = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () { this.dataset.scrolled = 'true'; }; w.scrollTo = options.scrollTo || (() => {});
  d.elementFromPoint = () => d.getElementById('work'); w.confirm = () => true;
  w.createImageBitmap = async () => ({ width: 1000, height: 800, close() {} });
  w.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,dGVzdA==';
  Object.defineProperty(d, 'hidden', { get: () => hidden }); d.hasFocus = () => focused;
  w.chrome = {
    runtime: { onMessage: { addListener: fn => messageListeners.add(fn), removeListener: fn => messageListeners.delete(fn) }, sendMessage: async message => {
      messages.push(JSON.parse(JSON.stringify(message)));
      if (message.type === 'neo:work') return work.request(message);
      if (message.type === 'neo:state') return { ok: true, settings, task, isTaskTab: task?.tabId === 1 };
      if (message.type === 'neo:checkpoint-list') return { ok: true, items: checkpoints, activeId };
      if (message.type === 'neo:checkpoint-capture') { captureWasHidden = d.getElementById('neo-companion-root').style.visibility === 'hidden'; return { ok: true, image: 'data:image/png;base64,dGVzdA==' }; }
      if (message.type === 'neo:checkpoint-save') {
        const item = { ...message, id: `checkpoint-${checkpoints.length + 1}`, url: 'https://example.com', tabId: 1, createdAt: now, pinnedAt: now };
        checkpoints.unshift(item); activeId = item.id; task = item; return { ok: true, checkpoint: item };
      }
      if (message.type === 'neo:checkpoint-return') {
        const item = checkpoints.find(entry => entry.id === (message.id || activeId));
        if (item) for (const fn of messageListeners) fn({ type: 'neo:checkpoint-restore', checkpoint: item }, {}, () => {});
        return { ok: !!item };
      }
      if (message.type === 'neo:checkpoint-select') { activeId = message.id; task = checkpoints.find(item => item.id === activeId); return { ok: true }; }
      if (message.type === 'neo:checkpoint-delete') { checkpoints = checkpoints.filter(item => item.id !== message.id); activeId = checkpoints[0]?.id || null; task = checkpoints[0] || null; return { ok: true }; }
      if (message.type === 'neo:pending-restore') return { ok: true, checkpoint: null };
      if (message.type === 'neo:chat') return options.chatResponse || { ok: true, reply: '<img src=x onerror=alert(1)> Try one step.' };
      return { ok: true };
    } },
    storage: { local: { get: async () => ({ neoSettings: settings }), set: async value => {
      settings = value.neoSettings; for (const fn of storageListeners) fn({ neoSettings: { newValue: settings } }, 'local');
    } }, onChanged: { addListener: fn => storageListeners.add(fn), removeListener: fn => storageListeners.delete(fn) } }
  };
  w.eval(source('companion-config.js')); w.eval(source('content.js')); await settle();
  return {
    w, d, messages, get root() { return root; }, get captureWasHidden() { return captureWasHidden; }, $: id => root.getElementById(id), click: id => root.getElementById(id).click(),
    summon(type = 'neo:summon') { for (const fn of messageListeners) fn({ type }, {}, () => {}); },
    async advance(ms) { now += ms; for (const fn of intervals.values()) fn(); await settle(); },
    async settings(patch) { settings = { ...settings, ...patch }; for (const fn of storageListeners) fn({ neoSettings: { newValue: settings } }, 'local'); await settle(); },
    async visibility(value) { hidden = value; d.dispatchEvent(new w.Event('visibilitychange')); await settle(); },
    focus(value) { focused = value; },
    async chat(text) { root.getElementById('chat-input').value = text; root.getElementById('chat-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await settle(); },
    select() { const range = d.createRange(); range.selectNodeContents(d.getElementById('work')); w.getSelection().removeAllRanges(); w.getSelection().addRange(range); },
    dispose() { d.dispatchEvent(new w.Event('neo-companion-dispose')); w.close(); },
    listeners() { return { timers: intervals.size, messages: messageListeners.size, storage: storageListeners.size }; }
  };
}

test('cursor companion summons, freezes while open, and preserves the page', async () => {
  const s = await companion();
  assert.equal(s.d.getElementById('neo-companion-root').shadowRoot, null);
  s.d.getElementById('work').dispatchEvent(new s.w.MouseEvent('pointermove', { bubbles: true, clientX: 400, clientY: 250 }));
  assert.equal(s.$('mascot').style.left, '424px'); s.summon();
  assert.equal(s.$('panel').hidden, false); assert.equal(s.$('chat-section').open, true);
  s.d.getElementById('other').dispatchEvent(new s.w.MouseEvent('pointermove', { bubbles: true, clientX: 700, clientY: 400 }));
  assert.equal(s.$('mascot').style.left, '424px');
  s.click('hold'); assert.equal(s.$('capture-layer').hidden, false);
  s.$('capture-layer').dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle();
  assert.ok(s.messages.some(m => m.type === 'neo:checkpoint-capture')); assert.equal(s.captureWasHidden, true); assert.equal(s.$('capture-form').hidden, false);
  s.$('capture-form').dispatchEvent(new s.w.Event('submit', { bubbles: true, cancelable: true })); await settle();
  assert.ok(s.messages.some(m => m.type === 'neo:checkpoint-save'));
  s.click('restore'); await settle(); assert.ok(s.messages.some(m => m.type === 'neo:checkpoint-return'));
  assert.equal(s.d.getElementById('work').style.cssText, ''); s.dispose();
});

test('generated steps require review, preserve edits and persist across companion reloads', async () => {
  const storage = { local: {}, session: {} };
  const s = await companion({ workStorage: storage, settings: { aiEnabled: true }, chatResponse: { ok: true, reply: 'Here are suggested steps.', steps: ['Ask about the deadline', 'Read the customer notes'] } });
  s.summon(); s.root.querySelector('[data-mode=steps]').click(); await s.chat('Plan this unfamiliar task');
  assert.equal(s.messages.find(m => m.type === 'neo:chat').mode, 'steps');
  assert.equal(storage.local.neoWorkState, undefined);
  s.$('workflow-result').querySelector('textarea').value = 'Ask Alex about the review time';
  s.$('workflow-result').querySelector('button').click(); await settle();
  assert.equal(storage.local.neoWorkState.steps[0].text, 'Ask Alex about the review time');
  assert.equal(s.$('pane-plan').hidden, false);
  s.$('plan-list').querySelectorAll('button')[1].click(); await settle();
  assert.match(s.$('work-current').textContent, /Ask Alex/);
  s.w.eval(source('content.js')); await settle();
  assert.equal(s.$('plan-list').querySelectorAll('textarea').length, 2); s.dispose();
});

test('draft review never sends a message and saves locally only on request', async () => {
  const storage = { local: {}, session: {} };
  const s = await companion({ workStorage: storage, settings: { aiEnabled: true }, chatResponse: { ok: true, reply: 'Review this draft.', draft: 'Could you confirm which task takes priority?' } });
  s.summon(); s.root.querySelector('[data-mode=draft]').click(); await s.chat('Ask about priorities');
  s.$('workflow-result').querySelector('button').click();
  assert.match(s.$('work-draft').value, /priority/); assert.equal(storage.local.neoWorkState, undefined);
  s.click('draft-save'); await settle(); assert.match(storage.local.neoWorkState.draft, /priority/);
  assert.equal(s.messages.filter(m => m.type === 'neo:chat').length, 1); s.dispose();
});

test('failed AI request retains the typed question and attached text for a manual retry', async () => {
  const s = await companion({ settings: { aiEnabled: true }, chatResponse: { ok: false, error: 'No connection.' } });
  s.select(); s.summon(); s.click('attach'); await s.chat('Explain the request');
  assert.equal(s.$('chat-input').value, 'Explain the request');
  assert.match(s.$('attachment').textContent, /First sentence/);
  assert.equal(s.messages.filter(m => m.type === 'neo:chat').length, 1); s.dispose();
});

test('focus selection supports arrows and Enter without changing website styles', async () => {
  const s = await companion();
  for (const element of [s.d.getElementById('work'), s.d.getElementById('other')]) element.getClientRects = () => [{ width: 100, height: 30 }];
  s.summon(); s.click('focus');
  s.d.dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  assert.equal(s.d.getElementById('other').dataset.scrolled, 'true');
  s.d.dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.match(s.$('message').textContent, /Area focused/);
  assert.equal(s.d.getElementById('other').getAttribute('style'), null); s.dispose();
});

test('local plan serializes concurrent additions, restores deletion, and rejects stale draft saves', async () => {
  const storage = { local: {}, session: {} }, b = background(storage);
  await Promise.all(['First', 'Second'].map(text => b.request({ type: 'neo:work', action: 'add', steps: [text] })));
  assert.equal(storage.local.neoWorkState.steps.length, 2);
  const id = storage.local.neoWorkState.steps[0].id;
  await b.request({ type: 'neo:work', action: 'remove', id });
  await b.request({ type: 'neo:work', action: 'undo' });
  assert.equal(storage.local.neoWorkState.steps[0].id, id);
  await b.request({ type: 'neo:work', action: 'draft', text: 'My draft', revision: 0 });
  const conflict = await b.request({ type: 'neo:work', action: 'draft', text: 'Stale draft', revision: 0 });
  assert.equal(conflict.ok, false); assert.equal(storage.local.neoWorkState.draft, 'My draft');
  assert.equal((await background(storage).request({ type: 'neo:work', action: 'get' })).state.draft, 'My draft');
});
test('capture can be adjusted and cancelled with the keyboard without saving', async () => {
  const s = await companion(); s.summon(); s.click('hold');
  const before = s.$('capture-box').style.left;
  s.$('capture-layer').dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.notEqual(s.$('capture-box').style.left, before);
  s.$('capture-layer').dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(s.$('capture-layer').hidden, true); assert.equal(s.messages.some(message => message.type === 'neo:checkpoint-save'), false); s.dispose();
});
test('cross-tab drift waits for the threshold and never steals keyboard focus', async () => {
  const s = await companion({ task: { tabId: 2, pinnedAt: 100 } });
  const input = s.d.getElementById('name'); input.focus();
  await s.advance(1000); await s.advance(7999); assert.equal(s.$('panel').hidden, true);
  await s.advance(1); assert.equal(s.$('panel').hidden, false); assert.match(s.$('message').textContent, /pinned task/);
  assert.equal(s.d.activeElement, input); assert.equal(s.$('return-task').hidden, false);
  s.click('return-task'); await settle(); assert.ok(s.messages.some(m => m.type === 'neo:checkpoint-return')); s.dispose();
});
test('snooze prevents nudges but leaves manual summoning available; off really hides the host', async () => {
  const s = await companion(); s.summon(); s.click('snooze'); await settle(); await s.advance(30000);
  assert.equal(s.$('panel').hidden, true); s.summon(); assert.equal(s.$('panel').hidden, false);
  await s.settings({ enabled: false });
  assert.equal(s.d.getElementById('neo-companion-root').hidden, true);
  assert.equal(s.d.getElementById('neo-companion-root').style.display, 'none');
  s.summon(); assert.equal(s.$('panel').hidden, true);
  await s.settings({ enabled: true }); s.summon(); assert.equal(s.$('panel').hidden, false);
  s.dispose();
});
test('resume clears the immediate snooze guard and allows later proactive help', async () => {
  const s = await companion(); s.summon(); s.click('snooze'); await settle();
  await s.advance(30000); assert.equal(s.$('panel').hidden, true);
  await s.settings({ snoozeUntil: 0 }); await s.advance(1000);
  assert.equal(s.$('panel').hidden, false); assert.match(s.$('message').textContent, /short pause/);
  s.dispose();
});
test('field-pause help depends on inactivity, excludes passwords, and skips hidden pages', async () => {
  const s = await companion(); const input = s.d.getElementById('name'); input.focus();
  await s.advance(11000); assert.equal(s.$('panel').hidden, true);
  input.dispatchEvent(new s.w.Event('input', { bubbles: true })); await s.advance(2000); assert.equal(s.$('panel').hidden, true);
  await s.advance(10000); assert.match(s.$('message').textContent, /this field/);
  s.dispose();
  const t = await companion(); t.d.getElementById('secret').focus(); await t.advance(12000); assert.equal(t.$('panel').hidden, true);
  await t.visibility(true); await t.advance(60000); assert.equal(t.$('panel').hidden, true); t.dispose();
});
test('focus-area selection is reversible and does not change website styles', async () => {
  const s = await companion(); s.summon(); s.click('focus');
  const target = s.d.getElementById('work');
  target.dispatchEvent(new s.w.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
  assert.equal(s.$('highlight').classList.contains('spotlight'), true); assert.equal(target.getAttribute('style'), null);
  s.d.dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.equal(s.$('highlight').hidden, true); s.dispose();
});
test('offline chat invokes local actions and never makes an AI request', async () => {
  const s = await companion(); s.summon(); await s.chat('hold my place'); assert.equal(s.$('capture-layer').hidden, false); s.$('capture-layer').dispatchEvent(new s.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await s.chat('Explain gravity'); assert.match(s.$('chat-log').textContent, /enable AI chat/);
  assert.equal(s.messages.some(m => m.type === 'neo:chat'), false); s.dispose();
});
test('AI chat sends only typed messages unless selection is explicitly attached; replies are plain text', async () => {
  const s = await companion({ settings: { aiEnabled: true } }); s.select(); s.summon(); await s.chat('Hello');
  let request = s.messages.find(m => m.type === 'neo:chat'); assert.deepEqual(request.messages, [{ role: 'user', content: 'Hello' }]);
  assert.equal(s.$('chat-log').querySelector('img'), null);
  s.click('attach'); await s.chat('Explain this'); request = s.messages.filter(m => m.type === 'neo:chat').at(-1);
  assert.match(request.messages.at(-1).content, /First sentence/);
  s.click('clear-chat'); assert.equal(s.$('chat-log').textContent, ''); s.dispose();
});
test('direct chat action opens the chat pane and focuses its input', async () => {
  const s = await companion(); s.summon('neo:open-chat');
  assert.equal(s.$('pane-chat').hidden, false);
  assert.equal(s.root.activeElement, s.$('chat-input')); s.dispose();
});
test('AI failure stays in chat and leaves actions available; reinjection removes old timers/listeners', async () => {
  const s = await companion({ settings: { aiEnabled: true }, chatResponse: { ok: false, error: 'Server offline.' } });
  s.summon(); await s.chat('Help me plan'); assert.match(s.$('chat-log').textContent, /Server offline/);
  assert.equal(s.$('chat-send').disabled, false); s.click('hold'); await settle();
  s.w.eval(source('content.js')); await settle(); assert.equal(s.d.querySelectorAll('#neo-companion-root').length, 1);
  assert.deepEqual(s.listeners(), { timers: 1, messages: 1, storage: 1 }); s.dispose();
});

function background(storage = { local: {}, session: {} }, overrides = {}) {
  const events = {}, sent = [], updates = [];
  const chrome = {
    runtime: { id: 'a'.repeat(32), onMessage: { addListener: fn => events.message = fn } },
    commands: { onCommand: { addListener: fn => events.command = fn } },
    storage: Object.fromEntries(['local', 'session'].map(area => [area, {
      get: async key => Object.fromEntries((Array.isArray(key) ? key : [key]).map(name => [name, storage[area][name]])), set: async value => Object.assign(storage[area], value), remove: async key => { delete storage[area][key]; }
    }])),
    tabs: { query: async () => [{ id: 4 }], get: async id => ({ id, url: 'https://example.com/page', windowId: 2 }), create: async data => ({ id: 14, windowId: 2, ...data }), sendMessage: async (...args) => sent.push(args), update: async (id, data) => { updates.push({ id, ...data }); return { id, windowId: 2 }; }, onRemoved: { addListener: fn => events.removed = fn }, onUpdated: { addListener: fn => events.updated = fn }, captureVisibleTab: async () => 'data:image/png;base64,dGVzdA==' },
    windows: { update: async () => {} }, scripting: { executeScript: async () => {} }
  };
  Object.assign(chrome.tabs, overrides.tabs); Object.assign(chrome.scripting, overrides.scripting);
  const context = vm.createContext({ chrome, console, AbortSignal, Date, crypto: require('node:crypto').webcrypto, fetch: overrides.fetch || (() => { throw new Error('Unexpected network'); }) });
  context.importScripts = file => vm.runInContext(source(file), context);
  vm.runInContext(source('background.js'), context);
  return { events, sent, updates, request(message, tabId) { return new Promise(resolve => events.message(message, { id: chrome.runtime.id, ...(tabId !== undefined ? { tab: { id: tabId, url: 'https://example.com/page', windowId: 2 } } : {}) }, resolve)); } };
}
test('saved checkpoint survives worker restart and return activates the correct tab', async () => {
  const storage = { local: {}, session: {} }; const first = background(storage);
  const saved = await first.request({ type: 'neo:checkpoint-save', name: 'Report', image: 'data:image/webp;base64,dGVzdA==', rect: { x: 20, y: 40, width: 120, height: 80 }, scrollX: 0, scrollY: 0, locator: 'p:nth-of-type(1)' }, 7);
  assert.equal(saved.ok, true);
  const second = background(storage); const state = await second.request({ type: 'neo:state' }, 9);
  assert.equal(state.task.tabId, 7); assert.equal(state.isTaskTab, false);
  await second.request({ type: 'neo:checkpoint-return' }, 9); assert.equal(second.updates[0].id, 7);
  await second.events.removed(7); assert.equal(storage.local.neoCheckpoints.length, 1);
});
test('checkpoint capture requires the active tab and restores by reopening a closed page', async () => {
  const storage = { local: {}, session: {} };
  let restoreAttempts = 0;
  const b = background(storage, { tabs: { query: async () => [{ id: 7 }], get: async () => { throw new Error('closed'); }, sendMessage: async () => { if (!restoreAttempts++) throw new Error('loading'); } }, scripting: { executeScript: async () => { throw new Error('loading'); } } });
  assert.equal((await b.request({ type: 'neo:checkpoint-capture' }, 7)).ok, true);
  assert.match((await b.request({ type: 'neo:checkpoint-capture' }, 8)).error, /active/);
  await b.request({ type: 'neo:checkpoint-save', name: 'Place', image: 'data:image/webp;base64,dGVzdA==', rect: { x: 20, y: 40, width: 120, height: 80 }, scrollX: 0, scrollY: 0, locator: '' }, 7);
  const result = await b.request({ type: 'neo:checkpoint-return' }, 9);
  assert.equal(result.reopened, true); assert.equal(storage.session.neoPendingRestore.tabId, 14);
  await b.events.updated(14, { status: 'complete' }); assert.equal(storage.session.neoPendingRestore, undefined);
});
test('checkpoint storage stays local, has a clear limit, and supports deletion', async () => {
  const storage = { local: {}, session: {} }, b = background(storage);
  const capture = { type: 'neo:checkpoint-save', name: 'My place', image: 'data:image/webp;base64,dGVzdA==', rect: { x: 20, y: 40, width: 120, height: 80 }, scrollX: 0, scrollY: 0, locator: 'p:nth-of-type(1)', locatorOffsetY: 4 };
  const result = await b.request(capture, 7);
  assert.equal(result.ok, true); assert.equal(storage.local.neoCheckpoints[0].locatorOffsetY, 4);
  assert.equal('text' in storage.local.neoCheckpoints[0], false);
  storage.local.neoCheckpoints.push(...Array.from({ length: 11 }, (_, index) => ({ ...storage.local.neoCheckpoints[0], id: `other-${index}` })));
  assert.match((await b.request(capture, 7)).error, /Delete one/);
  assert.equal((await b.request({ type: 'neo:checkpoint-delete', id: result.checkpoint.id }, 7)).ok, true);
  assert.equal(storage.local.neoCheckpoints.length, 11);
  assert.equal((await b.request(capture, 7)).ok, true);
});
test('summon injects into an existing tab and reports a restricted-page failure', async () => {
  let injected = 0, attempts = 0, lastType;
  const b = background(undefined, { tabs: { sendMessage: async (_id, message) => { if (!attempts++) throw new Error('no receiver'); lastType = message.type; } }, scripting: { executeScript: async () => { injected++; } } });
  assert.equal((await b.request({ type: 'neo:summon-active' })).ok, true); assert.equal(injected, 1);
  assert.equal((await b.request({ type: 'neo:chat-active' })).ok, true);
  assert.equal(lastType, 'neo:open-chat');
  const restricted = background(undefined, { tabs: { sendMessage: async () => { throw new Error('restricted'); } }, scripting: { executeScript: async () => { throw new Error('restricted'); } } });
  assert.match((await restricted.request({ type: 'neo:summon-active' })).error, /cannot appear/);
});
test('background refuses AI calls while disabled and handles unavailable server', async () => {
  const b = background(); const message = { type: 'neo:chat', messages: [{ role: 'user', content: 'Hi' }] };
  assert.match((await b.request(message, 4)).error, /AI chat is off/);
  const enabled = background({ local: { neoSettings: { aiEnabled: true } }, session: {} }, { fetch: async () => { throw new Error('offline'); } });
  assert.match((await enabled.request(message, 4)).error, /unavailable/);
  const balance = background({ local: { neoSettings: { aiEnabled: true } }, session: {} }, { fetch: async () => ({ ok: false, json: async () => ({ error: 'DeepSeek balance is empty.' }) }) });
  assert.match((await balance.request(message, 4)).error, /balance is empty/);
});
