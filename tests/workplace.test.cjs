const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '../workplace');

test('unfamiliar workplace text stays literal; notes survive reload and clearing can be undone', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'http://127.0.0.1:4319', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const script = fs.readFileSync(path.join(root, 'workplace.js'), 'utf8');
  w.localStorage.setItem('neo-workplace-notes', 'My earlier thought'); w.eval(script);
  assert.equal(d.getElementById('work-notes').value, 'My earlier thought');
  d.getElementById('message-input').value = '<img src=x onerror=alert(1)> Please review the new budget.';
  d.getElementById('message-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(d.getElementById('assignment-text').querySelector('img'), null);
  assert.match(d.getElementById('assignment-text').textContent, /budget/);
  d.getElementById('select-message').click(); assert.match(w.getSelection().toString(), /budget/);
  d.getElementById('clear-notes').click(); assert.equal(w.localStorage.getItem('neo-workplace-notes'), '');
  d.getElementById('undo-notes').click(); assert.equal(w.localStorage.getItem('neo-workplace-notes'), 'My earlier thought');
  w.close();
});

test('workplace server serves only public example assets, never server configuration', async t => {
  const { createWorkplaceServer } = await import('../server/workplace.mjs');
  const server = createWorkplaceServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(`${url}/server/.env`)).status, 404);
  assert.equal((await fetch(`${url}/guide`)).status, 200);
});
