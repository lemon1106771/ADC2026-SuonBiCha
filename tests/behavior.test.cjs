const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../neo-extension');
function setup() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  const close = w.close.bind(w);
  w.close = () => setImmediate(close); // Let queued focus cleanup finish before disposing the DOM.
  let now = 100, hidden = false, tick;
  w.Date.now = () => now;
  w.setInterval = fn => { tick = fn; return 1; };
  w.clearInterval = () => { tick = null; };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  Object.defineProperty(d, 'hidden', { get: () => hidden });
  for (const file of ['neo.js', 'dashboard.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  return { w, d, $: id => d.getElementById(id), click: id => d.getElementById(id).click(), advance(ms) { now += ms; if (tick) tick(); }, visibility(value) { hidden = value; d.dispatchEvent(new w.Event('visibilitychange')); }, view(name) { d.querySelector(`[data-view="${name}"].nav-item`).click(); } };
}
test('drift requires eight seconds and preserves the selected paragraph and draft', () => {
  const s = setup(); const line = s.d.querySelector('.report-line'); line.click();
  s.$('report-draft').value = 'Keep this thought';
  s.visibility(true); s.advance(7999); s.visibility(false);
  assert.equal(s.$('neo-bubble').hidden, true);
  s.visibility(true); s.advance(8000); s.visibility(false);
  assert.equal(s.$('neo-bubble').hidden, false);
  assert.equal(line.classList.contains('current-line'), true);
  assert.equal(s.$('report-draft').value, 'Keep this thought'); s.w.close();
});
test('calendar changes repeatedly, explains the new state, and does not accumulate attendees', () => {
  const s = setup(); s.view('calendar'); s.click('simulate-change');
  assert.equal(s.$('old-time').textContent, '11:00–11:30');
  assert.equal(s.$('new-time').textContent, '11:30–12:00');
  assert.match(s.$('note-change').textContent, /Sam/);
  s.click('simulate-change');
  assert.equal(s.$('old-time').textContent, '11:30–12:00');
  assert.equal(s.$('new-time').textContent, '10:30–11:00');
  assert.match(s.$('note-action').textContent, /10:30/);
  assert.equal(s.$('attendees').querySelectorAll('.avatar').length, 3);
  assert.equal(s.$('change-note').querySelectorAll('p').length, 3); s.w.close();
});
test('countdown passes all stages, can restart, and opens a local call', () => {
  const s = setup(); s.click('simulate-meeting');
  assert.match(s.$('meeting-status').textContent, /10 min/);
  s.advance(4000); assert.match(s.$('meeting-status').textContent, /5 min/);
  s.advance(4000); assert.match(s.$('meeting-status').textContent, /1 min/);
  assert.equal(s.$('join-call').hidden, false);
  s.click('join-call'); assert.equal(s.$('call-dialog').open, true);
  s.click('leave-call'); assert.equal(s.$('call-dialog').open, false);
  s.click('simulate-meeting'); assert.match(s.$('meeting-status').textContent, /10 min/); s.w.close();
});
test('Spotlight follows every keyboard-focused field and clears outside fields', async () => {
  const s = setup(); s.view('onboarding');
  for (const input of s.d.querySelectorAll('.field input')) {
    input.focus(); assert.equal(s.d.querySelectorAll('.field.lit').length, 1);
    assert.equal(input.closest('.field').classList.contains('lit'), true);
  }
  s.d.querySelector('[type="submit"]').focus(); await Promise.resolve();
  assert.equal(s.$('onboarding-view').classList.contains('spotlighting'), false);
  s.$('full-name').focus(); s.$('page-title').dispatchEvent(new s.w.Event('pointerdown', { bubbles: true }));
  assert.equal(s.$('onboarding-view').classList.contains('spotlighting'), false); s.w.close();
});
test('restart clears all data and cancels an active countdown', () => {
  const s = setup(); s.click('simulate-meeting'); s.$('report-draft').value = 'Draft';
  s.view('calendar'); s.click('simulate-change'); s.view('onboarding');
  s.$('full-name').value = 'Demo Person'; s.$('full-name').focus(); s.click('restart'); s.advance(20000);
  assert.equal(s.d.body.dataset.view, 'report'); assert.equal(s.$('report-draft').value, '');
  assert.equal(s.$('full-name').value, ''); assert.equal(s.$('new-time').textContent, '11:00–11:30');
  assert.equal(s.$('meeting-status').textContent, 'Next meeting in —');
  assert.equal(s.$('join-call').hidden, true); assert.equal(s.$('change-note').hidden, true);
  assert.equal(s.$('neo-bubble').hidden, true); assert.equal(s.$('neo-ring').hidden, true); s.w.close();
});
test('popup opens the bundled extension workspace', async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'popup.html'), 'utf8'), { runScripts: 'outside-only' });
  let opened;
  const close = dom.window.close.bind(dom.window);
  dom.window.close = () => setImmediate(close);
  dom.window.chrome = { storage: { local: { get: async () => ({}) } }, tabs: { create: async value => { opened = value.url; } }, runtime: { id: 'test', getURL: file => `chrome-extension://test/${file}` } };
  dom.window.eval(fs.readFileSync(path.join(root, 'companion-config.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root, 'popup.js'), 'utf8'));
  dom.window.document.getElementById('open-workspace').click(); await Promise.resolve();
  assert.equal(opened, 'chrome-extension://test/dashboard.html');
});
test('manifest and asset references are local and present', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.equal(manifest.manifest_version, 3); assert.deepEqual(manifest.host_permissions, ['http://*/*', 'https://*/*', 'http://127.0.0.1/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['http://*/*', 'https://*/*']);
  for (const file of [...manifest.content_scripts[0].js, manifest.background.service_worker]) assert.equal(fs.existsSync(path.join(root, file)), true);
  for (const page of ['dashboard.html', 'popup.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.equal(fs.existsSync(path.join(root, asset)), true, asset);
  }
  assert.ok(fs.statSync(path.join(root, 'fonts/Manrope.ttf')).size > 10000);
});
