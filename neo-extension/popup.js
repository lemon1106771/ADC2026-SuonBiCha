'use strict';
const status = document.getElementById('popup-status');
const settingNames = ['enabled', 'followCursor', 'proactive', 'demoMode', 'aiEnabled'];
const choices = ['detail', 'format', 'tone', 'driftMinutes', 'pauseMinutes', 'promptSeconds'];
let settings = { ...NEO_CONFIG.defaults };
let saving = Promise.resolve();
function save(patch) {
  settings = { ...settings, ...patch };
  saving = saving.then(async () => {
    const current = await chrome.storage.local.get('neoSettings');
    await chrome.storage.local.set({ neoSettings: { ...NEO_CONFIG.defaults, ...current.neoSettings, ...patch } });
  }).catch(() => { status.textContent = 'Could not save settings. Reopen Neo and try again.'; });
  return saving;
}
async function init() {
  try {
    const stored = await chrome.storage.local.get('neoSettings'); settings = { ...settings, ...stored.neoSettings };
    for (const name of settingNames) document.getElementById(name).checked = settings[name];
    for (const name of choices) document.getElementById(name).value = String(settings[name]);
    if (settings.snoozeUntil > Date.now()) status.textContent = 'Proactive nudges are snoozed. You can still summon Neo.';
    const saved = await chrome.storage.local.get('neoCheckpoints');
    document.getElementById('checkpoint-count').textContent = String(saved.neoCheckpoints?.length || 0);
  } catch { status.textContent = 'Refresh the extension to reconnect.'; }
  document.getElementById('extension-id').textContent = `Extension ID: ${chrome.runtime.id}`;
}
for (const name of settingNames) document.getElementById(name).addEventListener('change', event => save({ [name]: event.target.checked }));
for (const name of choices) document.getElementById(name).addEventListener('change', event => save({ [name]: ['driftMinutes', 'pauseMinutes', 'promptSeconds'].includes(name) ? Number(event.target.value) : event.target.value }));
document.getElementById('check-ai').addEventListener('click', async () => {
  const button = document.getElementById('check-ai'), output = document.getElementById('ai-status');
  button.disabled = true; output.textContent = 'Checking…';
  try { const result = await chrome.runtime.sendMessage({ type: 'neo:health' }); output.textContent = result?.ok ? result.message : result?.error || 'Server unavailable.'; }
  catch { output.textContent = 'Reload the extension and try again.'; }
  button.disabled = false;
});
async function launch(type) {
  await save({ enabled: true }); document.getElementById('enabled').checked = true;
  try {
    const result = await chrome.runtime.sendMessage({ type });
    if (result?.ok) window.close(); else status.textContent = result?.error || 'Refresh this website and try again.';
  } catch { status.textContent = 'Refresh the extension and try again.'; }
}
document.getElementById('summon').addEventListener('click', () => launch('neo:summon-active'));
document.getElementById('capture').addEventListener('click', () => launch('neo:capture-active'));
document.getElementById('open-saved').addEventListener('click', () => launch('neo:saved-active'));
document.getElementById('resume').addEventListener('click', async () => { await save({ snoozeUntil: 0 }); status.textContent = 'Nudges resumed when proactive help is enabled.'; });
document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
document.getElementById('open-workspace').addEventListener('click', async () => { await chrome.tabs.create({ url: 'http://127.0.0.1:4319' }); window.close(); });
init();
