'use strict';
const status = document.getElementById('popup-status');
const settingNames = ['enabled', 'followCursor', 'proactive', 'demoMode', 'aiEnabled'];
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
    if (settings.snoozeUntil > Date.now()) status.textContent = 'Proactive nudges are snoozed. You can still summon Neo.';
  } catch { status.textContent = 'Refresh the extension to reconnect.'; }
  document.getElementById('extension-id').textContent = `Extension ID: ${chrome.runtime.id}`;
}
for (const name of settingNames) document.getElementById(name).addEventListener('change', event => save({ [name]: event.target.checked }));
document.getElementById('summon').addEventListener('click', async () => {
  await save({ enabled: true }); document.getElementById('enabled').checked = true;
  try {
    const result = await chrome.runtime.sendMessage({ type: 'neo:summon-active' });
    if (result?.ok) window.close(); else status.textContent = result?.error || 'Refresh this website and try again.';
  } catch { status.textContent = 'Refresh the extension and try again.'; }
});
document.getElementById('resume').addEventListener('click', async () => { await save({ snoozeUntil: 0 }); status.textContent = 'Nudges resumed when proactive help is enabled.'; });
document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
document.getElementById('open-workspace').addEventListener('click', async () => { await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }); window.close(); });
init();
