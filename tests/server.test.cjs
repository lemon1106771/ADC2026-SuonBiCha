const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

async function serverFixture(t, options = {}) {
  const { createNeoServer } = await import('../server/server.mjs');
  const calls = [];
  const extensionId = 'a'.repeat(32);
  const server = createNeoServer({
    extensionId, apiKey: 'test-only-not-a-real-key',
    fetchImpl: async (url, config) => {
      calls.push({ url, config });
      return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Start with one paragraph.' }] }] }) };
    }, ...options
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/chat`;
  const headers = { 'Content-Type': 'application/json', 'X-Neo-Extension': extensionId, Origin: `chrome-extension://${extensionId}` };
  return { calls, request(body, extra = {}) { return fetch(url, { method: 'POST', headers, body: JSON.stringify(body), ...extra }); }, headers };
}
test('AI proxy accepts a valid conversation, keeps the key server-side, and disables response storage', async t => {
  const s = await serverFixture(t);
  const response = await s.request({ messages: [{ role: 'user', content: 'Help me begin.' }] });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { reply: 'Start with one paragraph.' });
  assert.equal(s.calls.length, 1);
  const body = JSON.parse(s.calls[0].config.body);
  assert.equal(body.store, false); assert.equal(body.input[0].content, 'Help me begin.');
  assert.equal(s.calls[0].url, 'https://api.openai.com/v1/responses');
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
