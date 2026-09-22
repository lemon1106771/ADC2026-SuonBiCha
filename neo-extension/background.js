'use strict';
importScripts('companion-config.js');

const CHECKPOINTS_KEY = 'neoCheckpoints';
const ACTIVE_KEY = 'neoActiveCheckpointId';
const MAX_CHECKPOINTS = 12;
const MAX_IMAGE_LENGTH = 650_000;
let checkpointWrites = Promise.resolve();
const normalPage = url => /^https?:\/\//i.test(url || '');
const checkpointSummary = item => ({ id: item.id, name: item.name, url: item.url, createdAt: item.createdAt, tabId: item.tabId, scrollX: item.scrollX, scrollY: item.scrollY, rect: item.rect, locator: item.locator, locatorOffsetX: item.locatorOffsetX || 0, locatorOffsetY: item.locatorOffsetY || 0 });

function serializeCheckpointWrite(operation) {
  const next = checkpointWrites.then(operation);
  checkpointWrites = next.catch(() => {});
  return next;
}

async function restoreInTab(tabId, item) {
  try { await chrome.tabs.sendMessage(tabId, { type: 'neo:checkpoint-restore', checkpoint: checkpointSummary(item) }); return true; }
  catch { return false; }
}
async function ensureRestoreInTab(tabId, item) {
  if (await restoreInTab(tabId, item)) return true;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['companion-config.js', 'content.js'] });
    return await restoreInTab(tabId, item);
  } catch { return false; }
}

async function returnToCheckpoint(id) {
  const stored = await chrome.storage.local.get([CHECKPOINTS_KEY, ACTIVE_KEY]);
  const item = (stored[CHECKPOINTS_KEY] || []).find(entry => entry.id === (id || stored[ACTIVE_KEY]));
  if (!item) return { ok: false, error: 'No saved checkpoint. Capture an area first.' };
  await chrome.storage.local.set({ [ACTIVE_KEY]: item.id });
  let tab = null;
  if (Number.isInteger(item.tabId)) {
    try { tab = await chrome.tabs.get(item.tabId); if (tab.url !== item.url) tab = null; } catch { tab = null; }
  }
  try {
    if (tab) {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      if (!await ensureRestoreInTab(tab.id, item)) await chrome.storage.session.set({ neoPendingRestore: { tabId: tab.id, id: item.id, expires: Date.now() + 30_000 } });
      return { ok: true };
    }
    tab = await chrome.tabs.create({ url: item.url, active: true });
    await serializeCheckpointWrite(async () => {
      const { neoCheckpoints = [] } = await chrome.storage.local.get(CHECKPOINTS_KEY);
      await chrome.storage.local.set({ [CHECKPOINTS_KEY]: neoCheckpoints.map(entry => entry.id === item.id ? { ...entry, tabId: tab.id } : entry) });
    });
    await chrome.storage.session.set({ neoPendingRestore: { tabId: tab.id, id: item.id, expires: Date.now() + 30_000 } });
    if (await ensureRestoreInTab(tab.id, item)) await chrome.storage.session.remove('neoPendingRestore');
    return { ok: true, reopened: true };
  } catch { return { ok: false, error: 'This page could not be reopened. The checkpoint is still saved.' }; }
}

async function summon(tabId, type = 'neo:summon') {
  if (!Number.isInteger(tabId)) return { ok: false, error: 'Open a website tab first.' };
  try {
    try { await chrome.tabs.sendMessage(tabId, { type }); }
    catch {
      // Also supports a tab that was already open when Neo was installed/reloaded.
      await chrome.scripting.executeScript({ target: { tabId }, files: ['companion-config.js', 'content.js'] });
      await chrome.tabs.sendMessage(tabId, { type });
    }
    return { ok: true };
  } catch { return { ok: false, error: 'Neo cannot appear on this page. Try a normal website; Chrome settings, the Web Store, and built-in PDF pages are restricted.' }; }
}

async function handle(message, sender) {
  if (message.type === 'neo:checkpoint-capture') {
    if (!sender.tab?.id || !normalPage(sender.tab.url)) return { ok: false, error: 'Capture works on normal website tabs.' };
    const [active] = await chrome.tabs.query({ active: true, windowId: sender.tab.windowId });
    if (active?.id !== sender.tab.id) return { ok: false, error: 'Keep this tab active while capturing.' };
    try { return { ok: true, image: await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }) }; }
    catch { return { ok: false, error: 'Chrome could not capture this page. Try the toolbar button first.' }; }
  }
  if (message.type === 'neo:checkpoint-save') {
    if (!sender.tab?.id || !normalPage(sender.tab.url)) return { ok: false, error: 'Open a normal website to save a checkpoint.' };
    const { image, rect, scrollX, scrollY, locator } = message;
    if (typeof image !== 'string' || !/^data:image\/(webp|jpeg);base64,/.test(image) || image.length > MAX_IMAGE_LENGTH || !rect || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) || rect.width < 12 || rect.height < 12 || !Number.isFinite(scrollX) || !Number.isFinite(scrollY) || typeof locator !== 'string' || locator.length > 500 || (message.locatorOffsetX !== undefined && !Number.isFinite(message.locatorOffsetX)) || (message.locatorOffsetY !== undefined && !Number.isFinite(message.locatorOffsetY))) return { ok: false, error: 'That capture could not be saved. Select the area again.' };
    return serializeCheckpointWrite(async () => {
      const stored = await chrome.storage.local.get(CHECKPOINTS_KEY);
      const items = stored[CHECKPOINTS_KEY] || [];
      if (items.length >= MAX_CHECKPOINTS) return { ok: false, error: `You can keep ${MAX_CHECKPOINTS} checkpoints. Delete one to save another.` };
      const item = { id: crypto.randomUUID(), name: String(message.name || '').trim().slice(0, 80) || 'Untitled checkpoint', image, url: sender.tab.url, createdAt: Date.now(), tabId: sender.tab.id, rect, scrollX, scrollY, locator, locatorOffsetX: message.locatorOffsetX || 0, locatorOffsetY: message.locatorOffsetY || 0 };
      try { await chrome.storage.local.set({ [CHECKPOINTS_KEY]: [item, ...items], [ACTIVE_KEY]: item.id }); }
      catch { return { ok: false, error: 'Local storage is full. Delete a checkpoint to make room.' }; }
      return { ok: true, checkpoint: checkpointSummary(item) };
    });
  }
  if (message.type === 'neo:checkpoint-list') {
    const stored = await chrome.storage.local.get([CHECKPOINTS_KEY, ACTIVE_KEY]);
    return { ok: true, items: stored[CHECKPOINTS_KEY] || [], activeId: stored[ACTIVE_KEY] || null };
  }
  if (message.type === 'neo:checkpoint-select') {
    const stored = await chrome.storage.local.get(CHECKPOINTS_KEY);
    if (!(stored[CHECKPOINTS_KEY] || []).some(item => item.id === message.id)) return { ok: false, error: 'That checkpoint is no longer available.' };
    await chrome.storage.local.set({ [ACTIVE_KEY]: message.id });
    return { ok: true };
  }
  if (message.type === 'neo:checkpoint-delete') return serializeCheckpointWrite(async () => {
    const stored = await chrome.storage.local.get([CHECKPOINTS_KEY, ACTIVE_KEY]);
    const items = (stored[CHECKPOINTS_KEY] || []).filter(item => item.id !== message.id);
    if (items.length === (stored[CHECKPOINTS_KEY] || []).length) return { ok: false, error: 'That checkpoint is no longer available.' };
    await chrome.storage.local.set({ [CHECKPOINTS_KEY]: items, [ACTIVE_KEY]: stored[ACTIVE_KEY] === message.id ? (items[0]?.id || null) : stored[ACTIVE_KEY] });
    return { ok: true };
  });
  if (message.type === 'neo:checkpoint-return' || message.type === 'neo:return') return returnToCheckpoint(message.id);
  if (message.type === 'neo:pending-restore' && sender.tab?.id) {
    const { neoPendingRestore } = await chrome.storage.session.get('neoPendingRestore');
    if (!neoPendingRestore || neoPendingRestore.tabId !== sender.tab.id || neoPendingRestore.expires < Date.now()) return { ok: true, checkpoint: null };
    const { neoCheckpoints = [] } = await chrome.storage.local.get(CHECKPOINTS_KEY);
    const item = neoCheckpoints.find(entry => entry.id === neoPendingRestore.id);
    await chrome.storage.session.remove('neoPendingRestore');
    return { ok: true, checkpoint: item ? checkpointSummary(item) : null };
  }
  if (message.type === 'neo:chat') {
    const { neoSettings } = await chrome.storage.local.get('neoSettings');
    if (!neoSettings?.aiEnabled) return { ok: false, error: 'AI chat is off. I can still help with local actions. Enable AI chat in the Neo toolbar after setting up the local server.' };
    const history = message.messages;
    if (!Array.isArray(history) || history.length > 12 || history.some(item => !['user', 'assistant'].includes(item?.role) || typeof item.content !== 'string' || item.content.length > 6000)) return { ok: false, error: 'Please send a shorter message.' };
    try {
      const response = await fetch('http://127.0.0.1:4318/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Neo-Extension': chrome.runtime.id },
        body: JSON.stringify({ messages: history }), signal: AbortSignal.timeout(30_000), credentials: 'omit'
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        return { ok: false, error: typeof failure.error === 'string' && failure.error.length <= 180 ? failure.error : 'AI chat is unavailable. Check the local server.' };
      }
      const result = await response.json();
      if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('empty');
      return { ok: true, reply: result.reply.slice(0, 6000) };
    } catch { return { ok: false, error: 'AI chat is unavailable. Check the local server and its API key. Your quick actions still work.' }; }
  }
  if (message.type === 'neo:state') {
    const local = await chrome.storage.local.get(['neoSettings', CHECKPOINTS_KEY, ACTIVE_KEY]);
    const active = (local[CHECKPOINTS_KEY] || []).find(item => item.id === local[ACTIVE_KEY]);
    return { ok: true, settings: { ...NEO_CONFIG.defaults, ...local.neoSettings }, task: active ? { ...checkpointSummary(active), pinnedAt: active.createdAt } : null, isTaskTab: active?.tabId === sender.tab?.id && active?.url === sender.tab?.url, checkpointCount: (local[CHECKPOINTS_KEY] || []).length };
  }
  // Summon requests from the extension popup use the current active tab, not page input.
  if (['neo:summon-active', 'neo:capture-active', 'neo:saved-active', 'neo:chat-active'].includes(message.type) && !sender.tab) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return summon(tab?.id, message.type === 'neo:capture-active' ? 'neo:capture' : message.type === 'neo:saved-active' ? 'neo:show-saved' : message.type === 'neo:chat-active' ? 'neo:open-chat' : 'neo:summon');
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
  const { neoPendingRestore } = await chrome.storage.session.get('neoPendingRestore');
  if (neoPendingRestore?.tabId === tabId) await chrome.storage.session.remove('neoPendingRestore');
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const { neoPendingRestore } = await chrome.storage.session.get('neoPendingRestore');
  if (neoPendingRestore?.tabId !== tabId || neoPendingRestore.expires < Date.now()) return;
  const { neoCheckpoints = [] } = await chrome.storage.local.get(CHECKPOINTS_KEY);
  const item = neoCheckpoints.find(entry => entry.id === neoPendingRestore.id);
  if (item && await ensureRestoreInTab(tabId, item)) await chrome.storage.session.remove('neoPendingRestore');
});
