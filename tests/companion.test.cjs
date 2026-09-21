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
  let settings = { demoMode: true, ...options.settings }, task = options.task || null;
  const messages = [], messageListeners = new Set(), storageListeners = new Set();
  const attach = w.Element.prototype.attachShadow;
  w.Element.prototype.attachShadow = function (args) { root = attach.call(this, args); return root; };
  w.Date.now = () => now; w.setInterval = fn => { intervals.set(++nextId, fn); return nextId; }; w.clearInterval = id => intervals.delete(id);
  w.requestAnimationFrame = fn => { fn(); return 0; }; w.cancelAnimationFrame = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () { this.dataset.scrolled = 'true'; }; w.scrollTo = () => {};
  Object.defineProperty(d, 'hidden', { get: () => hidden }); d.hasFocus = () => focused;
  w.chrome = {
    runtime: { onMessage: { addListener: fn => messageListeners.add(fn), removeListener: fn => messageListeners.delete(fn) }, sendMessage: async message => {
      messages.push(JSON.parse(JSON.stringify(message)));
      if (message.type === 'neo:state') return { ok: true, settings, task, isTaskTab: task?.tabId === 1 };
      if (message.type === 'neo:pin') task = { tabId: 1, pinnedAt: now };
      if (message.type === 'neo:unpin') task = null;
      if (message.type === 'neo:chat') return options.chatResponse || { ok: true, reply: '<img src=x onerror=alert(1)> Try one step.' };
      return { ok: true };
    } },
    storage: { local: { get: async () => ({ neoSettings: settings }), set: async value => {
      settings = value.neoSettings; for (const fn of storageListeners) fn({ neoSettings: { newValue: settings } }, 'local');
    } }, onChanged: { addListener: fn => storageListeners.add(fn), removeListener: fn => storageListeners.delete(fn) } }
  };
  w.eval(source('companion-config.js')); w.eval(source('content.js')); await settle();
  return {
    w, d, messages, get root() { return root; }, $: id => root.getElementById(id), click: id => root.getElementById(id).click(),
    summon() { for (const fn of messageListeners) fn({ type: 'neo:summon' }, {}, () => {}); },
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
  s.click('hold'); await settle(); assert.ok(s.messages.some(m => m.type === 'neo:pin'));
  s.click('restore'); assert.equal(s.d.getElementById('work').dataset.scrolled, 'true');
  assert.equal(s.d.getElementById('work').style.cssText, ''); s.dispose();
});
test('cross-tab drift waits for the threshold and never steals keyboard focus', async () => {
  const s = await companion({ task: { tabId: 2, pinnedAt: 100 } });
  const input = s.d.getElementById('name'); input.focus();
  await s.advance(1000); await s.advance(7999); assert.equal(s.$('panel').hidden, true);
  await s.advance(1); assert.equal(s.$('panel').hidden, false); assert.match(s.$('message').textContent, /pinned task/);
  assert.equal(s.d.activeElement, input); assert.equal(s.$('return-task').hidden, false);
  s.click('return-task'); await settle(); assert.ok(s.messages.some(m => m.type === 'neo:return')); s.dispose();
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
  const s = await companion(); s.summon(); await s.chat('hold my place'); assert.ok(s.messages.some(m => m.type === 'neo:pin'));
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
      get: async key => ({ [key]: storage[area][key] }), set: async value => Object.assign(storage[area], value), remove: async key => { delete storage[area][key]; }
    }])),
    tabs: { query: async () => [{ id: 4 }], sendMessage: async (...args) => sent.push(args), update: async (id, data) => { updates.push({ id, ...data }); return { windowId: 2 }; }, onRemoved: { addListener: fn => events.removed = fn } },
    windows: { update: async () => {} }, scripting: { executeScript: async () => {} }
  };
  Object.assign(chrome.tabs, overrides.tabs); Object.assign(chrome.scripting, overrides.scripting);
  const context = vm.createContext({ chrome, console, AbortSignal, Date, fetch: overrides.fetch || (() => { throw new Error('Unexpected network'); }) });
  context.importScripts = file => vm.runInContext(source(file), context);
  vm.runInContext(source('background.js'), context);
  return { events, sent, updates, request(message, tabId) { return new Promise(resolve => events.message(message, { id: chrome.runtime.id, ...(tabId !== undefined ? { tab: { id: tabId } } : {}) }, resolve)); } };
}
test('pinned task survives worker restart and return activates the correct tab', async () => {
  const storage = { local: {}, session: {} }; const first = background(storage);
  await first.request({ type: 'neo:pin' }, 7);
  const second = background(storage); const state = await second.request({ type: 'neo:state' }, 9);
  assert.equal(state.task.tabId, 7); assert.equal(state.isTaskTab, false);
  await second.request({ type: 'neo:return' }, 9); assert.equal(second.updates[0].id, 7);
  await second.events.removed(7); assert.equal(storage.session.neoTask, undefined);
});
test('summon injects into an existing tab and reports a restricted-page failure', async () => {
  let injected = 0, attempts = 0;
  const b = background(undefined, { tabs: { sendMessage: async () => { if (!attempts++) throw new Error('no receiver'); } }, scripting: { executeScript: async () => { injected++; } } });
  assert.equal((await b.request({ type: 'neo:summon-active' })).ok, true); assert.equal(injected, 1);
  const restricted = background(undefined, { tabs: { sendMessage: async () => { throw new Error('restricted'); } }, scripting: { executeScript: async () => { throw new Error('restricted'); } } });
  assert.match((await restricted.request({ type: 'neo:summon-active' })).error, /cannot appear/);
});
test('background refuses AI calls while disabled and handles unavailable server', async () => {
  const b = background(); const message = { type: 'neo:chat', messages: [{ role: 'user', content: 'Hi' }] };
  assert.match((await b.request(message, 4)).error, /AI chat is off/);
  const enabled = background({ local: { neoSettings: { aiEnabled: true } }, session: {} }, { fetch: async () => { throw new Error('offline'); } });
  assert.match((await enabled.request(message, 4)).error, /unavailable/);
});
