'use strict';
// Demo: eight real seconds. A real-world starting point would be 10 * 60 * 1000.
const DRIFT_THRESHOLD_MS = 8_000;
const MEETING_STAGE_MS = 4_000;
const $ = id => document.getElementById(id);
let view = 'report';
let awaySince = null;
let lastLine = $('initial-line');
let meetingTimer = null;
let calendarIndex = 0;
let meeting = { start: '11:00', end: '11:30', people: ['Lan', 'Alex'] };
const headings = {
  report: ['A LITTLE LESS FRICTION', 'Find your focus.', 'One thing in front of you. A little support beside you.', 'Minh'],
  calendar: ['A LITTLE MORE CERTAINTY', 'Make room for your day.', 'When plans change, you deserve a clear explanation.', 'Lan'],
  onboarding: ['A LITTLE LESS NOISE', 'Just this next step.', 'The rest can wait while you focus on what’s in front of you.', 'Lan']
};
function changeView(next) {
  view = next; document.body.dataset.view = next; awaySince = null; Neo.rest();
  document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== `${next}-view`);
  document.querySelectorAll('.nav-item').forEach(el => { const active = el.dataset.view === next; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  const [eyebrow, title, subtitle, person] = headings[next];
  $('eyebrow').textContent = eyebrow; $('page-title').textContent = title; $('page-subtitle').textContent = subtitle;
  $('profile-name').textContent = `${person}’s workspace`; $('profile-avatar').textContent = person[0];
  $('simulate-meeting').hidden = next !== 'report'; $('simulate-change').hidden = next !== 'calendar'; $('spotlight-hint').hidden = next !== 'onboarding';
  $('demo-hint').textContent = next === 'report' ? 'Try another browser tab for 8 seconds, then return.' : next === 'calendar' ? 'Each click changes the meeting again.' : 'A real focus event, for every field.';
  clearSpotlight();
}
document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => changeView(el.dataset.view)));
// Minh can choose the exact paragraph to return to; the draft is a valid anchor too.
function holdPlace(el) { document.querySelectorAll('.current-line').forEach(line => line.classList.remove('current-line')); lastLine = el; el.classList.add('current-line'); $('place-label').textContent = el.id === 'report-draft' ? 'Your next thought' : el.textContent.startsWith('This quarter') || el.textContent.startsWith('Our team') ? '01 · The overview' : '02 · What we’re learning'; }
document.querySelectorAll('.report-line, #report-draft').forEach(el => { el.addEventListener('focus', () => holdPlace(el)); el.addEventListener('click', () => holdPlace(el)); });
$('report-draft').addEventListener('input', () => { $('save-status').textContent = 'Kept in this tab'; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (view === 'report') awaySince = Date.now(); return; }
  if (view === 'report' && awaySince !== null && Date.now() - awaySince >= DRIFT_THRESHOLD_MS) {
    lastLine.scrollIntoView({ block: 'center', behavior: 'instant' });
    Neo.point(lastLine, 'Still on the report? Here’s exactly where you stopped.');
  }
  awaySince = null;
});
function updateMeetingStage(stage) {
  const minutes = [10, 5, 1][stage]; $('meeting-status').textContent = `Next meeting in ${minutes} min`;
  $('join-call').hidden = stage !== 2;
  if (view === 'report') Neo.point(stage === 2 ? $('join-call') : $('meeting-status'), ['10 minutes until Sprint Review. You have time to finish a thought.', '5 minutes. Your place will be here when you return.', '1 minute. Join when you’re ready.'][stage]);
}
$('simulate-meeting').addEventListener('click', () => {
  clearInterval(meetingTimer); let stage = 0; const started = Date.now(); updateMeetingStage(stage);
  meetingTimer = setInterval(() => { const next = Math.min(2, Math.floor((Date.now() - started) / MEETING_STAGE_MS)); if (next !== stage) { stage = next; updateMeetingStage(stage); } if (stage === 2) { clearInterval(meetingTimer); meetingTimer = null; } }, 200);
});
$('join-call').addEventListener('click', () => { Neo.rest(); $('call-dialog').showModal(); });
$('leave-call').addEventListener('click', () => { $('call-dialog').close(); $('join-call').hidden = true; $('meeting-status').textContent = 'Sprint Review · attended in demo'; });
// Lan receives literal explanations of actual state changes, never a scripted clip.
const calendarChanges = [{ start: '11:30', end: '12:00', person: 'Sam' }, { start: '10:30', end: '11:00', person: 'Jo' }, { start: '11:00', end: '11:30', person: 'Kim' }, { start: '11:30', end: '12:00', person: 'Ari' }];
function renderMeeting(old, added) {
  $('grid-time').textContent = meeting.start; $('new-time').textContent = `${meeting.start}–${meeting.end}`;
  $('old-time').hidden = !old; $('old-time').textContent = old ? `${old.start}–${old.end}` : ''; $('change-badge').hidden = !old;
  $('attendees').replaceChildren();
  meeting.people.forEach(name => { const el = document.createElement('span'); el.className = `avatar${name === added ? ' new-attendee' : ''}`; el.title = name; el.textContent = name[0]; $('attendees').append(el); });
  const names = document.createElement('span'); names.className = 'attendee-names'; names.textContent = meeting.people.join(', '); $('attendees').append(names);
}
$('simulate-change').addEventListener('click', () => {
  const old = { ...meeting }; const change = calendarChanges[calendarIndex++ % calendarChanges.length];
  meeting = { start: change.start, end: change.end, people: ['Lan', 'Alex', change.person] }; renderMeeting(old, change.person);
  $('note-change').textContent = `${old.start} → ${meeting.start}; ${change.person} joins.`;
  $('note-meaning').textContent = 'The meeting is still 30 minutes.';
  $('note-action').textContent = `Join at ${meeting.start}. No extra preparation.`;
  $('change-note').hidden = false; Neo.point($('meeting-card'), null);
});
function clearSpotlight() { $('onboarding-view').classList.remove('spotlighting'); document.querySelectorAll('.field').forEach(el => el.classList.remove('lit')); }
$('onboarding-form').addEventListener('focusin', event => { const field = event.target.closest('.field'); clearSpotlight(); if (field) { $('onboarding-view').classList.add('spotlighting'); field.classList.add('lit'); Neo.point(field, null, false); } else Neo.rest(); });
$('onboarding-form').addEventListener('focusout', () => { queueMicrotask(() => { if (!document.activeElement.closest('.field')) { clearSpotlight(); if (view === 'onboarding') Neo.rest(); } }); });
document.addEventListener('pointerdown', event => { if (view === 'onboarding' && !event.target.closest('.field')) { clearSpotlight(); Neo.rest(); } });
$('onboarding-form').addEventListener('submit', event => { event.preventDefault(); clearSpotlight(); Neo.rest(); $('form-status').textContent = 'Demo details kept in this tab. You can keep editing.'; });
$('restart').addEventListener('click', () => {
  resetBackup = { draft: $('report-draft').value, fields: [...document.querySelectorAll('#onboarding-form input')].map(input => [input.id, input.value]) };
  undoReset.hidden = false;
  clearInterval(meetingTimer); meetingTimer = null; awaySince = null; calendarIndex = 0;
  meeting = { start: '11:00', end: '11:30', people: ['Lan', 'Alex'] }; renderMeeting(); $('change-note').hidden = true;
  $('onboarding-form').reset(); $('form-status').textContent = 'Demo entries stay in this tab until you restart or close it.';
  $('report-draft').value = ''; $('save-status').textContent = 'Session draft'; holdPlace($('initial-line'));
  $('meeting-status').textContent = 'Next meeting in —'; $('join-call').hidden = true; $('call-dialog').close();
  changeView('report'); window.scrollTo({ top: 0, behavior: 'instant' });
  persistDraft();
});
// The older demo remains usable, with recovery for accidental reset and reload.
let resetBackup = null;
const undoReset = document.createElement('button'); undoReset.className = 'text-button'; undoReset.textContent = 'Undo cleared entries'; undoReset.hidden = true;
$('restart').after(undoReset);
function persistDraft() { try { localStorage.setItem('neo-dashboard-draft', $('report-draft').value); } catch { $('save-status').textContent = 'Not saved — keep this tab open'; } }
try { $('report-draft').value = localStorage.getItem('neo-dashboard-draft') || ''; if ($('report-draft').value) $('save-status').textContent = 'Restored draft'; } catch { /* Storage may be unavailable. */ }
$('report-draft').addEventListener('input', persistDraft);
undoReset.addEventListener('click', () => { if (!resetBackup) return; $('report-draft').value = resetBackup.draft; for (const [id, value] of resetBackup.fields) $(id).value = value; persistDraft(); undoReset.hidden = true; resetBackup = null; });
