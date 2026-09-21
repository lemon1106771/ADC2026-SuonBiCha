'use strict';
importScripts('companion-config.js');

async function summon(tabId) {
  if (!Number.isInteger(tabId)) return { ok: false, error: 'Open a website tab first.' };
  try {
    try { await chrome.tabs.sendMessage(tabId, { type: 'neo:summon' }); }
    catch {
      // Also supports a tab that was already open when Neo was installed/reloaded.
      await chrome.scripting.executeScript({ target: { tabId }, files: ['companion-config.js', 'content.js'] });
      await chrome.tabs.sendMessage(tabId, { type: 'neo:summon' });
    }
    return { ok: true };
  } catch { return { ok: false, error: 'Neo cannot appear on this page. Try a normal website; Chrome settings, the Web Store, and built-in PDF pages are restricted.' }; }
}

async function handle(message, sender) {
  if (message.type === 'neo:chat') {
    const { neoSettings } = await chrome.storage.local.get('neoSettings');
    if (!neoSettings?.aiEnabled) return { ok: false, error: 'AI chat is off. I can still help with local actions. Enable AI chat in the Neo toolbar after setting up the local server.' };
    const history = message.messages;
    if (!Array.isArray(history) || history.length > 12 || history.some(item => !['user', 'assistant'].includes(item?.role) || typeof item.content !== 'string' || item.content.length > 6000)) return { ok: false, error: 'Please send a shorter message.' };
    try {
      const response = await fetch('http://127.0.0.1:4318/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Neo-Extension': chrome.runtime.id },
        body: JSON.stringify({ messages: history }), signal: AbortSignal.timeout(12_000), credentials: 'omit'
      });
      if (!response.ok) throw new Error('unavailable');
      const result = await response.json();
      if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('empty');
      return { ok: true, reply: result.reply.slice(0, 6000) };
    } catch { return { ok: false, error: 'AI chat is unavailable. Check the local server and its API key. Your quick actions still work.' }; }
  }
  if (message.type === 'neo:state') {
    const [local, session] = await Promise.all([chrome.storage.local.get('neoSettings'), chrome.storage.session.get('neoTask')]);
    return { ok: true, settings: { ...NEO_CONFIG.defaults, ...local.neoSettings }, task: session.neoTask || null, isTaskTab: session.neoTask?.tabId === sender.tab?.id };
  }
  if (message.type === 'neo:pin' && sender.tab?.id !== undefined) {
    // Store only the tab ID, never its text, address, form values, or selection.
    await chrome.storage.session.set({ neoTask: { tabId: sender.tab.id, pinnedAt: Date.now() } });
    return { ok: true };
  }
  if (message.type === 'neo:unpin') { await chrome.storage.session.remove('neoTask'); return { ok: true }; }
  if (message.type === 'neo:return') {
    const { neoTask } = await chrome.storage.session.get('neoTask');
    if (!neoTask) return { ok: false, error: 'No task is pinned. Use “Hold my place” on your work tab.' };
    try {
      const tab = await chrome.tabs.update(neoTask.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.sendMessage(neoTask.tabId, { type: 'neo:restore' }).catch(() => {});
      return { ok: true };
    } catch { await chrome.storage.session.remove('neoTask'); return { ok: false, error: 'That work tab has closed. You can hold a new place.' }; }
  }
  // Summon requests from the extension popup use the current active tab, not page input.
  if (message.type === 'neo:summon-active' && !sender.tab) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return summon(tab?.id);
  }
  return { ok: false };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message?.type?.startsWith('neo:')) return;
  handle(message, sender).then(respond, () => respond({ ok: false, error: 'Neo needs a refresh. Reload this page and try again.' }));
  return true;
});
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'summon-neo') return;
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await summon(tab?.id);
});
chrome.tabs.onRemoved.addListener(async tabId => {
  const { neoTask } = await chrome.storage.session.get('neoTask');
  if (neoTask?.tabId === tabId) await chrome.storage.session.remove('neoTask');
});
