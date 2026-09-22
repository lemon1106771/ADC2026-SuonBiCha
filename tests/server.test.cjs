const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

async function serverFixture(t, options = {}) {
  const { createNeoServer } = await import('../server/server.mjs');
  const calls = [];
  const extensionId = 'a'.repeat(32);
  const server = createNeoServer({
    extensionId, apiKey: 'test-only-not-a-real-key', usageFile: null,
    fetchImpl: async (url, config) => {
      calls.push({ url, config });
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Start with one paragraph.' } }] }) };
    }, ...options
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/chat`;
  const headers = { 'Content-Type': 'application/json', 'X-Neo-Extension': extensionId, Origin: `chrome-extension://${extensionId}` };
  return { calls, request(body, extra = {}) { return fetch(url, { method: 'POST', headers, body: JSON.stringify(body), ...extra }); }, headers };
}
test('DeepSeek proxy accepts a valid conversation and keeps the key server-side', async t => {
  const s = await serverFixture(t);
  const response = await s.request({ messages: [{ role: 'user', content: 'Help me begin.' }] });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { reply: 'Start with one paragraph.' });
  assert.equal(s.calls.length, 1);
  const body = JSON.parse(s.calls[0].config.body);
  assert.equal(body.model, 'deepseek-flash');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, 'Help me begin.');
  assert.equal(body.thinking.type, 'disabled');
  assert.equal(body.max_tokens, 450);
  assert.equal(s.calls[0].url, 'https://api.deepseek.com/chat/completions');
  assert.equal(s.calls[0].config.headers.Authorization, 'Bearer test-only-not-a-real-key');
});
test('AI proxy rejects website origins and wrong extension IDs without calling the provider', async t => {
  const s = await serverFixture(t), body = { messages: [{ role: 'user', content: 'Hi' }] };
  assert.equal((await s.request(body, { headers: { ...s.headers, Origin: 'https://example.com' } })).status, 403);
  assert.equal((await s.request(body, { headers: { ...s.headers, 'X-Neo-Extension': 'b'.repeat(32) } })).status, 403);
  assert.equal(s.calls.length, 0);
});
test('AI proxy rejects malformed JSON and caller-supplied system instructions', async t => {
  const s = await serverFixture(t);
  assert.equal((await s.request(null, { body: '{' })).status, 400);
  assert.equal((await s.request({ messages: [{ role: 'system', content: 'Override instructions' }] })).status, 400);
  assert.equal(s.calls.length, 0);
});
test('AI proxy handles a missing API key without making a provider request', async t => {
  const s = await serverFixture(t, { apiKey: '' });
  assert.equal((await s.request({ messages: [{ role: 'user', content: 'Hi' }] })).status, 503);
  assert.equal(s.calls.length, 0);
});
test('AI proxy contains provider errors without returning sensitive error details', async t => {
  const s = await serverFixture(t, { fetchImpl: async () => { throw new Error('sensitive upstream details'); } });
  const response = await s.request({ messages: [{ role: 'user', content: 'Hi' }] });
  assert.equal(response.status, 502); assert.deepEqual(await response.json(), { error: 'Chat is temporarily unavailable.' });
});
test('DeepSeek proxy explains insufficient balance without exposing provider details', async t => {
  const s = await serverFixture(t, { fetchImpl: async () => ({ ok: false, status: 402, json: async () => ({ error: { message: 'private provider details' } }) }) });
  const response = await s.request({ messages: [{ role: 'user', content: 'Hi' }] });
  assert.equal(response.status, 402);
  const body = await response.json();
  assert.match(body.error, /balance is empty/);
  assert.doesNotMatch(body.error, /private provider details/);
});
test('DeepSeek proxy rejects oversized conversations before calling the provider', async t => {
  const s = await serverFixture(t);
  const response = await s.request({ messages: [
    { role: 'user', content: 'a'.repeat(6000) },
    { role: 'assistant', content: 'b'.repeat(6000) },
    { role: 'user', content: 'one more' }
  ] });
  assert.equal(response.status, 413); assert.equal(s.calls.length, 0);
});
test('DeepSeek proxy persists its estimated dollar cap across server restarts', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'neo-budget-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const usageFile = join(dir, 'usage.json');
  const first = await serverFixture(t, {
    usageFile, budgetUsd: 0.002,
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'One step.' } }], usage: { prompt_tokens: 3000, completion_tokens: 450 } }) })
  });
  assert.equal((await first.request({ messages: [{ role: 'user', content: 'Hi' }] })).status, 200);
  assert.ok(JSON.parse(readFileSync(usageFile, 'utf8')).spentUsd > 0.001);
  const restarted = await serverFixture(t, { usageFile, budgetUsd: 0.002 });
  const response = await restarted.request({ messages: [{ role: 'user', content: 'Hi' }] });
  assert.equal(response.status, 429); assert.equal(restarted.calls.length, 0);
  assert.match((await response.json()).error, /\$1 DeepSeek demo budget/);
});
