'use strict';
const $ = id => document.getElementById(id);
const sample = 'Hi! Could you turn the customer notes into a short onboarding update before Thursday’s review? Pull out the main friction points and suggest what we should tackle first.\n\nThere’s also the welcome-page copy to look at when you get a chance. Keep me posted if anything is unclear. Thanks!';
let undo = null;
function read(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, value); return true; } catch { $('save-state').textContent = 'Storage is unavailable. Copy your notes before leaving.'; return false; } }
$('assignment-text').textContent = read('neo-workplace-message', sample);
$('message-input').value = $('assignment-text').textContent;
$('work-notes').value = read('neo-workplace-notes');
$('message-form').addEventListener('submit', event => { event.preventDefault(); const value = $('message-input').value.trim(); if (!value) return; $('assignment-text').textContent = value; save('neo-workplace-message', value); $('assignment').scrollIntoView({ block: 'start' }); $('assignment-text').focus(); $('page-status').textContent = 'Your message is ready to select. Nothing has been sent to AI.'; });
$('select-message').addEventListener('click', () => { const range = document.createRange(); range.selectNodeContents($('assignment-text')); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); $('page-status').textContent = 'Message selected. Press Alt Shift N to summon the Neo extension, then Attach selection.'; });
$('work-notes').addEventListener('input', () => { if (save('neo-workplace-notes', $('work-notes').value)) $('save-state').textContent = 'Saved on this device.'; });
$('clear-notes').addEventListener('click', () => { undo = $('work-notes').value; $('work-notes').value = ''; if (save('neo-workplace-notes', '')) $('save-state').textContent = 'Notes cleared. Undo is available.'; $('undo-notes').hidden = false; });
$('undo-notes').addEventListener('click', () => { $('work-notes').value = undo || ''; if (save('neo-workplace-notes', $('work-notes').value)) $('save-state').textContent = 'Notes restored.'; $('undo-notes').hidden = true; });
