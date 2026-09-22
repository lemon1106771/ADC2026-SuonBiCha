(() => {
  'use strict';
  // Reinjection after an extension reload replaces the old listeners and isolated UI.
  document.dispatchEvent(new Event('neo-companion-dispose'));
  const abort = new AbortController();
  const listen = (target, event, fn, options = {}) => target.addEventListener(event, fn, { ...options, signal: abort.signal });
  const host = document.createElement('div');
  host.id = 'neo-companion-root';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;width:0!important;height:0!important;z-index:2147483647!important;pointer-events:none!important;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host{all:initial;color-scheme:light}*{box-sizing:border-box} [hidden]{display:none!important}
      .neo{font:13px/1.5 system-ui,sans-serif;color:#1B211D;letter-spacing:normal;text-align:left}
      button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2C6E5C;outline-offset:3px}
      #mascot{position:fixed;left:24px;top:calc(100vh - 70px);width:42px;height:42px;border-radius:50%;border:1px solid #8A5313;background:#F0AE4E;pointer-events:auto;opacity:.65;transition:opacity .2s,transform .2s;box-shadow:0 2px 10px #1B211D15}
      #mascot:hover,#mascot:focus-visible,.opened #mascot{opacity:1;transform:scale(1.06)}
      #mascot:before,#mascot:after{content:'';position:absolute;top:14px;width:3px;height:4px;background:#1B211D;border-radius:50%}#mascot:before{left:12px}#mascot:after{right:12px}#mascot i{position:absolute;left:15px;top:20px;width:10px;height:6px;border-bottom:2px solid #1B211D;border-radius:50%}
      #panel{position:fixed;width:310px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;background:#F6F4EF;border:1px solid #E4E0D6;border-radius:16px;padding:18px;pointer-events:auto;box-shadow:0 8px 30px #1B211D20}
      header{display:flex;align-items:center;gap:8px}header strong{font-size:19px;letter-spacing:-.7px}header span{font-size:10px;color:#6E6A61}#close{margin-left:auto;border:0;background:none;font-size:23px;line-height:1;padding:3px 6px;color:#6E6A61}
      #message{font-size:13px;line-height:1.65;margin:15px 0;color:#1B211D}#reason{font-size:10px;color:#6E6A61;margin:0 0 14px}
      .actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.actions button,#return-task{border:1px solid #E4E0D6;border-radius:8px;background:#FFFDF8;color:#1B211D;padding:10px 8px;font-size:11px;text-align:left}.actions button:hover{background:#F0EEE7}#return-task{width:100%;background:#1B211D;color:#F6F4EF;margin-bottom:9px}
      footer{display:flex;gap:10px;justify-content:space-between;margin-top:14px;border-top:1px solid #E4E0D6;padding-top:12px}footer button{border:0;background:none;color:#6E6A61;font-size:10px;padding:3px 0}kbd{font:10px system-ui;color:#6E6A61}
      #reading{padding:12px;background:#FFFDF8;border:1px solid #E4E0D6;border-radius:8px;margin-bottom:12px;font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;max-height:210px;overflow:auto}
      #chat-section{margin-top:16px;border-top:1px solid #E4E0D6;padding-top:12px}summary{cursor:pointer;font-weight:600;font-size:12px}#chat-mode{font-size:10px;color:#6E6A61;margin:8px 0}#chat-log{max-height:170px;overflow:auto;overscroll-behavior:contain}.chat-line{font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;padding:9px;border-radius:8px;background:#FFFDF8;margin:7px 0}.chat-line.user{background:#E8EEE7}.chat-label{display:block;font-size:9px;color:#6E6A61;margin-bottom:4px}#chat-input{display:block;width:100%;font:12px/1.6 system-ui,sans-serif;background:#FFFDF8;color:#1B211D;border:1px solid #BEBBB1;border-radius:8px;padding:9px;resize:vertical;min-height:65px;max-height:160px}#chat-input:focus-visible{outline:2px solid #2C6E5C;outline-offset:2px}.chat-controls{display:flex;gap:8px;align-items:center;margin-top:8px}.chat-controls button{font-size:10px;border:1px solid #E4E0D6;border-radius:6px;background:#FFFDF8;padding:7px;color:#1B211D}#chat-send{margin-left:auto;background:#1B211D;color:#F6F4EF}#attachment{font-size:10px;color:#2C6E5C;margin:7px 0}#chat-status{font-size:10px;color:#6E6A61;min-height:15px;margin:5px 0}#chat-input-label{display:block;font-size:10px;margin:9px 0 5px}
      #highlight{position:fixed;border:2px solid #2C6E5C;border-radius:8px;pointer-events:none;box-shadow:0 0 0 3px #6FC7B04D}#highlight.spotlight{box-shadow:0 0 0 100vmax #1B211D80}
      #panel{width:330px;padding:14px}#message{margin:10px 0 2px;font-weight:600}#reason{margin:0 0 10px}.view-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;background:#EAE7DE;border-radius:9px;margin:10px 0}.view-tabs button{border:0;background:transparent;border-radius:7px;padding:7px 3px;font-size:12px;min-height:36px}.view-tabs button[aria-pressed=true]{background:#FFFDF8;font-weight:700;box-shadow:0 1px 3px #1B211D18}.pane{min-height:112px}.pane h2{font-size:13px;margin:9px 0 4px}.pane p{font-size:12px;line-height:1.5;color:#6E6A61}.main-action,.minor-action,#save-checkpoint{width:100%;border:1px solid #1B211D;border-radius:8px;padding:9px 10px;min-height:40px;background:#1B211D;color:#FFFDF8;text-align:center;font-size:12px}.minor-action{background:#FFFDF8;color:#1B211D;border-color:#E4E0D6}.capture-preview{max-width:100%;max-height:150px;display:block;margin:10px auto;border:1px solid #E4E0D6;border-radius:6px}.capture-form label{display:block;font-size:12px;margin:8px 0 4px}.capture-form input{width:100%;border:1px solid #BEBBB1;background:#FFFDF8;border-radius:7px;padding:8px;color:#1B211D}.capture-form .actions{margin-top:9px}#saved-list{display:grid;gap:8px;max-height:260px;overflow:auto}.saved-item{display:grid;grid-template-columns:68px 1fr;gap:8px;background:#FFFDF8;border:1px solid #E4E0D6;border-radius:9px;padding:7px}.saved-item.active{border-color:#2C6E5C}.saved-item img{width:68px;height:52px;object-fit:cover;border-radius:5px}.saved-item strong{display:block;font-size:12px;overflow-wrap:anywhere}.saved-item small{display:block;color:#6E6A61;font-size:10px;overflow-wrap:anywhere}.saved-item .item-actions{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap}.saved-item button{font-size:11px;min-height:29px;padding:4px 6px;border:1px solid #E4E0D6;border-radius:5px;background:#F6F4EF}#chat-section{margin:0;border:0;padding:0}#chat-section summary{display:none}#chat-log{max-height:185px}.tools{display:flex;gap:6px;margin:10px 0}.tools button{flex:1;font-size:11px;min-height:34px;padding:7px 4px;border:1px solid #E4E0D6;border-radius:6px;background:#FFFDF8}#capture-layer{position:fixed;inset:0;pointer-events:auto;cursor:crosshair;background:#1B211D30;touch-action:none}#capture-instruction{position:fixed;top:12px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:8px 12px;background:#1B211D;color:white;border-radius:8px;font:12px system-ui;box-shadow:0 2px 10px #0003}#capture-box{position:fixed;border:2px solid #2C6E5C;background:#6FC7B022;box-shadow:0 0 0 1px white;pointer-events:none}#capture-layer:focus-visible{outline:3px solid #2C6E5C;outline-offset:-5px}
      @media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
    </style>
    <div class="neo"><div id="highlight" hidden></div><div id="capture-layer" role="application" tabindex="-1" aria-label="Select a screenshot region" hidden><div id="capture-instruction">Drag to select. Arrow keys move, Shift + arrows resize, Enter captures, Escape cancels.</div><div id="capture-box" hidden></div></div><button id="mascot" title="Ask Neo (Alt+Shift+N)" aria-label="Ask Neo" aria-expanded="false" aria-controls="panel"><i></i></button>
      <section id="panel" aria-label="Neo personal assistant" hidden><header><strong>neo</strong><span>Your quiet companion</span><button id="close" aria-label="Dismiss Neo">×</button></header>
      <p id="message" role="status"></p><p id="reason"></p><nav class="view-tabs" aria-label="Neo views"><button id="tab-capture" type="button" aria-pressed="true">Capture</button><button id="tab-saved" type="button" aria-pressed="false">Saved</button><button id="tab-chat" type="button" aria-pressed="false">Chat</button></nav>
      <div id="pane-capture" class="pane"><p>Keep a picture of the exact area you want to return to.</p><button id="hold" class="main-action">Capture an area</button><form id="capture-form" class="capture-form" hidden><img id="capture-preview" class="capture-preview" alt="Screenshot preview"><label for="capture-name">Checkpoint name</label><input id="capture-name" maxlength="80" required><div class="actions"><button id="save-checkpoint" type="submit">Save checkpoint</button><button id="cancel-preview" type="button" class="minor-action">Cancel</button></div></form></div>
      <div id="pane-saved" class="pane" hidden><p id="saved-count"></p><div id="saved-list"></div><button id="restore" class="minor-action" hidden>Return to active checkpoint</button><button id="return-task" hidden>Return to my task</button></div>
      <div id="pane-chat" class="pane" hidden><details id="chat-section" open><summary>Chat with Neo</summary><p id="chat-mode">Local help · AI chat is off</p><div id="chat-log" role="log" aria-label="Conversation with Neo" aria-live="polite"></div><form id="chat-form"><label for="chat-input" id="chat-input-label">What do you need a hand with?</label><textarea id="chat-input" maxlength="2000" rows="2" placeholder="Ask a question or try “capture an area”…"></textarea><p id="attachment" hidden></p><div class="chat-controls"><button id="attach" type="button">Attach selection</button><button id="clear-chat" type="button">Clear chat</button><button id="chat-send" type="submit">Send</button></div><p id="chat-status" role="status"></p></form></details><div class="tools"><button id="focus">Focus an area</button><button id="read">Read selection</button><button id="clear-focus" hidden>Clear focus</button></div><div id="reading" hidden></div></div>
      <footer><button id="snooze">Quiet for 10 min</button><kbd>Alt + Shift + N</kbd></footer></section>
    </div>`;
  document.documentElement.append(host);
  const $ = id => root.getElementById(id);
  root.querySelector('style').textContent += `
    #panel{width:380px;font-size:14px}.view-tabs{grid-template-columns:repeat(4,1fr)}
    .neo button,.neo select{min-height:40px;font-size:13px}.neo input,.neo textarea,.neo select{font:14px/1.5 system-ui;color:#1B211D;background:#FFFDF8;border:1px solid #BEBBB1;border-radius:7px;padding:8px;max-width:100%}
    .neo input:focus-visible,.neo textarea:focus-visible,.neo select:focus-visible,.neo summary:focus-visible{outline:3px solid #2C6E5C;outline-offset:2px}
    #message,.pane p,.chat-line,#reading{font-size:14px}.neo small,#reason,#chat-mode,#chat-status,#attachment,.chat-label{font-size:12px}#chat-input{font-size:14px}
    .support-modes{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.support-modes button{border:1px solid #CFCABE;border-radius:8px;background:#FFFDF8}.support-modes button[aria-pressed=true]{background:#EAF3ED;border-color:#2C6E5C;color:#245946}
    #attachment{white-space:pre-wrap;max-height:110px;overflow:auto;background:#EAF3ED;padding:10px;border-radius:8px;overflow-wrap:anywhere}
    .plan-step{display:grid;grid-template-columns:24px 1fr;gap:8px;padding:10px 0;border-bottom:1px solid #E4E0D6}.plan-step.active{border-left:3px solid #2C6E5C;padding-left:8px}.plan-step input[type=checkbox]{width:20px;height:20px;margin-top:12px;accent-color:#2C6E5C}.plan-step textarea{width:100%;min-height:62px;resize:vertical}.step-actions{display:flex;gap:6px;flex-wrap:wrap;grid-column:2}.step-actions button,#pane-plan button,#workflow-result button{border:1px solid #CFCABE;background:#FFFDF8;border-radius:7px;padding:7px 10px}
    #pane-plan label,#workflow-result label{display:block;font-size:13px;margin:10px 0 5px}#plan-new,#work-draft,#result-draft{width:100%}#work-draft,#result-draft{min-height:140px;resize:vertical}
    #work-current{padding:12px;border-radius:9px;background:#EAF3ED;color:#245946}#plan-status{min-height:20px}#workflow-result{padding:12px;background:#EAF3ED;border-radius:9px;margin-top:12px}#workflow-result textarea{width:100%;resize:vertical}.result-step{margin:8px 0}#plan-list{max-height:320px;overflow:auto}.plan-buttons{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
    #health-check{border:1px solid #CFCABE;border-radius:6px;background:#FFFDF8}#chat-log:empty:before{content:'Bring a real message or task. You decide what to share.';display:block;color:#6E6A61;font-size:14px;padding:12px 0}.chat-controls,.tools{flex-wrap:wrap}.saved-item small{font-size:12px}#close{min-width:40px}footer button{font-size:12px}
    @media(max-width:430px){#panel{padding:12px}.view-tabs button{font-size:12px}header span{font-size:12px}}
  `;
  $('tab-chat').textContent = 'Ask Neo';
  root.querySelector('.view-tabs').insertAdjacentHTML('beforeend', '<button id="tab-plan" type="button" aria-pressed="false">My steps</button>');
  $('pane-chat').insertAdjacentHTML('afterend', `<div id="pane-plan" class="pane" hidden>
    <p id="work-current">Choose a next step when you are ready.</p><p id="plan-status" role="status"></p><div id="plan-list"></div>
    <form id="plan-add"><label for="plan-new">Add your own step</label><input id="plan-new" maxlength="500" required placeholder="One thing I can do next"><div class="plan-buttons"><button type="submit">Add step</button><button id="plan-undo" type="button" hidden>Undo removal</button></div></form>
    <label for="work-draft">Your message draft</label><textarea id="work-draft" maxlength="6000" placeholder="Draft a question, update, or support request. Nothing is sent for you."></textarea>
    <div class="plan-buttons"><button id="draft-save">Save draft</button><button id="draft-copy">Copy draft</button><button id="draft-load">Load saved draft</button><button id="draft-undo" hidden>Undo saved change</button></div><small>Steps and saved drafts stay on this device across tabs and restarts.</small></div>`);
  $('chat-mode').insertAdjacentHTML('afterend', `<button id="health-check" type="button">Check AI connection</button><div class="support-modes" aria-label="How Neo can help">
    <button data-mode="chat" aria-pressed="true" type="button">Ask anything</button><button data-mode="explain" aria-pressed="false" type="button">Understand this</button><button data-mode="steps" aria-pressed="false" type="button">Make next steps</button><button data-mode="draft" aria-pressed="false" type="button">Draft a message</button></div>`);
  $('chat-form').insertAdjacentHTML('afterend', '<section id="workflow-result" aria-label="Review AI suggestion" hidden></section>');
  $('read').textContent = 'Space out text';
  let supportMode = 'chat', workState = null, draftDirty = false, draftRevision = 0, workRevision = 0;
  let focusCandidates = [], focusIndex = 0;
  let settings = { ...NEO_CONFIG.defaults };
  let task = null, isTaskTab = false, ready = false;
  let pointer = { x: 24, y: innerHeight - 70 }, hasPointer = false, frame = 0;
  let lastTarget = null, highlight = null, highlightRect = null, spotlight = false, selecting = false;
  let checkpoints = [], activeId = null, captureRect = null, previewImage = '', previewRect = null, dragStart = null, captureBusy = false;
  let selection = '', previousFocus = null, automatic = false, openedAt = 0, lastNudge = -Infinity;
  let visibleSince = Date.now(), awaySince = null, awayOnTaskSince = null, field = null, fieldActivity = 0;
  let deepFocusNudged = false, fieldNudged = false, driftNudged = false;
  let history = [], attachment = '', chatBusy = false, chatEpoch = 0;
  let localSnoozeUntil = 0;
  let settingsRevision = 0, refreshRevision = 0;
  const timing = () => settings.demoMode ? NEO_CONFIG.demo : { ...NEO_CONFIG.normal, drift: Math.max(1, Math.min(60, Number(settings.driftMinutes) || 5)) * 60_000, deepFocus: Math.max(5, Math.min(120, Number(settings.pauseMinutes) || 25)) * 60_000 };
  const inNeo = event => event.composedPath().includes(host);
  const editable = element => element instanceof Element && element.matches('input:not([type=hidden]):not([type=password]),textarea,select,[contenteditable=true]');
  const sensitive = element => element instanceof Element && !!element.closest('input,textarea,[contenteditable=true]');
  const anchor = element => element instanceof Element && !host.contains(element) ? element.closest('p,li,h1,h2,h3,label,input,textarea,select,article,section,main') || element : null;
  const pageSelection = () => {
    const selected = window.getSelection();
    return sensitive(document.activeElement) || sensitive(selected?.anchorNode?.parentElement) ? '' : (selected?.toString() || '').slice(0, 6000);
  };

  function showView(view) {
    for (const name of ['capture', 'saved', 'chat', 'plan']) {
      $(`pane-${name}`).hidden = name !== view;
      $(`tab-${name}`).setAttribute('aria-pressed', String(name === view));
    }
    move();
  }
  function renderWork(state) {
    workState = state;
    const active = state.steps.find(step => step.id === state.activeId);
    $('work-current').textContent = active ? `My next step: ${active.text}` : `${state.steps.filter(s => s.done).length} of ${state.steps.length} done. Choose a next step when ready.`;
    $('plan-undo').hidden = !state.removed; $('draft-undo').hidden = state.previousDraft == null;
    if (!draftDirty) { $('work-draft').value = state.draft; draftRevision = state.draftRevision; }
    // Keep edits and keyboard focus stable during cross-tab storage notifications.
    if ($('plan-list').contains(root.activeElement)) return;
    $('plan-list').replaceChildren();
    for (const step of state.steps) {
      const row = document.createElement('div'); row.className = `plan-step${step.id === state.activeId ? ' active' : ''}`; row.dataset.stepId = step.id;
      const done = document.createElement('input'); done.type = 'checkbox'; done.checked = step.done; done.setAttribute('aria-label', `Complete: ${step.text}`);
      const text = document.createElement('textarea'); text.value = step.text; text.maxLength = 500; text.rows = 2; text.setAttribute('aria-label', 'Edit step');
      const actions = document.createElement('div'); actions.className = 'step-actions';
      const save = document.createElement('button'); save.textContent = 'Save edit';
      const next = document.createElement('button'); next.textContent = step.id === state.activeId ? 'Working on this' : 'Do this next';
      const remove = document.createElement('button'); remove.textContent = 'Remove';
      done.onchange = () => mutateWork({ action: 'done', id: step.id, done: done.checked });
      save.onclick = () => mutateWork({ action: 'edit', id: step.id, text: text.value });
      next.onclick = () => mutateWork({ action: 'active', id: step.id });
      remove.onclick = () => mutateWork({ action: 'remove', id: step.id });
      actions.append(save, next, remove); row.append(done, text, actions); $('plan-list').append(row);
    }
  }
  async function loadWork() {
    const revision = ++workRevision; const result = await send('neo:work', { action: 'get' });
    if (revision === workRevision && result?.ok && result.state && !abort.signal.aborted) renderWork(result.state);
  }
  async function mutateWork(patch) {
    ++workRevision;
    const result = await send('neo:work', patch);
    if (abort.signal.aborted) return false;
    if (result?.ok && result.state) {
      if (patch.action === 'draft' || patch.action === 'undo-draft') { draftDirty = false; draftRevision = result.state.draftRevision; }
      const focused = root.activeElement;
      if ($('plan-list').contains(focused)) focused.blur();
      renderWork(result.state); $('plan-status').textContent = 'Saved on this device.';
      if (patch.action === 'remove') $('plan-undo').focus();
      else if (patch.id) {
        const row = [...$('plan-list').children].find(item => item.dataset.stepId === patch.id);
        (patch.action === 'done' ? row?.querySelector('input') : patch.action === 'edit' ? row?.querySelector('textarea') : row?.querySelectorAll('button')[1])?.focus();
      }
      return true;
    }
    $('plan-status').textContent = result?.error || 'Could not save. Your text is still here.';
    return false;
  }
  listen($('plan-add'), 'submit', async event => { event.preventDefault(); if (await mutateWork({ action: 'add', steps: [$('plan-new').value] })) $('plan-new').value = ''; });
  listen($('plan-undo'), 'click', () => mutateWork({ action: 'undo' }));
  listen($('work-draft'), 'input', () => { draftDirty = true; $('plan-status').textContent = 'Unsaved draft — choose Save draft to keep it.'; });
  listen($('draft-save'), 'click', () => mutateWork({ action: 'draft', text: $('work-draft').value, revision: draftRevision }));
  listen($('draft-undo'), 'click', () => { if (!draftDirty || window.confirm('Replace your unsaved edits with the previous saved draft?')) mutateWork({ action: 'undo-draft', revision: draftRevision }); });
  listen($('draft-load'), 'click', async () => { if (draftDirty && !window.confirm('Replace unsaved edits with your saved draft?')) return; draftDirty = false; await loadWork(); });
  listen($('draft-copy'), 'click', async () => {
    try { await navigator.clipboard.writeText($('work-draft').value); $('plan-status').textContent = 'Copied. Review and paste it when you are ready.'; }
    catch { $('work-draft').focus(); $('work-draft').select(); $('plan-status').textContent = 'Copy is blocked here. Your draft is selected; use Ctrl+C or Command+C.'; }
  });
  for (const button of root.querySelectorAll('[data-mode]')) listen(button, 'click', () => {
    supportMode = button.dataset.mode;
    root.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('chat-input').placeholder = { chat: 'What would help right now?', explain: 'Paste a message or attach selected text. What is unclear?', steps: 'What is the task? Paste instructions or attach selected text.', draft: 'Who are you writing to, and what do you want to ask or say?' }[supportMode];
    $('chat-input').focus();
  });
  listen($('health-check'), 'click', async () => {
    $('health-check').disabled = true; $('chat-status').textContent = 'Checking local AI server…';
    const result = await send('neo:health'); $('health-check').disabled = false;
    $('chat-status').textContent = result?.ok ? `${result.message}${settings.aiEnabled ? '' : ' Enable AI chat in the toolbar to send.'}` : result?.error || 'Server unavailable.';
  });
  function reviewResult(result) {
    const area = $('workflow-result'); area.replaceChildren(); area.hidden = true;
    if (Array.isArray(result.steps) && result.steps.length) {
      area.hidden = false;
      const title = document.createElement('h2'); title.textContent = 'Review your next steps'; area.append(title);
      const inputs = result.steps.map((step, index) => {
        const label = document.createElement('label'); label.textContent = `Step ${index + 1}`;
        const input = document.createElement('textarea'); input.value = step; input.maxLength = 500; input.rows = 2; label.append(input); area.append(label); return input;
      });
      const save = document.createElement('button'); save.textContent = 'Add to My steps';
      save.onclick = async () => { save.disabled = true; if (await mutateWork({ action: 'add', steps: inputs.map(input => input.value) })) { area.hidden = true; showView('plan'); } else { save.disabled = false; $('chat-status').textContent = $('plan-status').textContent; } };
      area.append(save);
    }
    if (typeof result.draft === 'string' && result.draft) {
      area.hidden = false;
      const label = document.createElement('label'); label.textContent = 'Review and edit before using'; label.htmlFor = 'result-draft';
      const input = document.createElement('textarea'); input.id = 'result-draft'; input.value = result.draft; input.maxLength = 6000;
      const save = document.createElement('button'); save.textContent = 'Use in draft editor';
      save.onclick = () => { if (draftDirty && !window.confirm('Replace the unsaved draft in your editor?')) return; $('work-draft').value = input.value; draftDirty = true; $('plan-status').textContent = 'Draft ready to edit. Save it to keep it, or copy when ready.'; showView('plan'); $('work-draft').focus(); };
      area.append(label, input, save);
    }
    move();
  }
  function renderSaved() {
    $('saved-count').textContent = checkpoints.length ? `${checkpoints.length} saved checkpoint${checkpoints.length === 1 ? '' : 's'} · stored on this device` : 'No checkpoints yet. Capture an area to get started.';
    $('saved-list').replaceChildren();
    $('restore').hidden = !activeId;
    for (const item of checkpoints) {
      const card = document.createElement('article'); card.className = `saved-item${item.id === activeId ? ' active' : ''}`;
      const image = document.createElement('img'); image.src = item.image; image.alt = `Preview of ${item.name}`;
      const details = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = item.name;
      const site = document.createElement('small'); site.textContent = `${new URL(item.url).hostname} · ${new Date(item.createdAt).toLocaleString()}`;
      const actions = document.createElement('div'); actions.className = 'item-actions';
      const go = document.createElement('button'); go.textContent = 'Return'; go.type = 'button'; go.setAttribute('aria-label', `Return to ${item.name}`);
      go.addEventListener('click', async () => { const result = await send('neo:checkpoint-return', { id: item.id }); if (!result?.ok) $('message').textContent = result?.error || 'Could not return to this checkpoint.'; else dismiss(false); });
      const select = document.createElement('button'); select.textContent = item.id === activeId ? 'Active' : 'Set active'; select.type = 'button'; select.disabled = item.id === activeId;
      select.addEventListener('click', async () => { const result = await send('neo:checkpoint-select', { id: item.id }); if (result?.ok) { activeId = item.id; renderSaved(); await refresh(); } });
      const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${item.name}`);
      remove.addEventListener('click', async () => { if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return; const result = await send('neo:checkpoint-delete', { id: item.id }); if (result?.ok) { await loadCheckpoints(); await refresh(); $('message').textContent = 'Checkpoint deleted.'; } else $('message').textContent = result?.error || 'Could not delete checkpoint.'; });
      actions.append(go, select, remove); details.append(name, site, actions); card.append(image, details); $('saved-list').append(card);
    }
  }
  async function loadCheckpoints() {
    const result = await send('neo:checkpoint-list');
    if (!result?.ok || abort.signal.aborted) return;
    checkpoints = Array.isArray(result.items) ? result.items : []; activeId = result.activeId || null; renderSaved();
  }

  function drawCaptureRect() {
    if (!captureRect) return;
    $('capture-box').hidden = false;
    Object.assign($('capture-box').style, { left: `${captureRect.x}px`, top: `${captureRect.y}px`, width: `${captureRect.width}px`, height: `${captureRect.height}px` });
  }
  function cancelCapture() { $('capture-layer').hidden = true; $('capture-box').hidden = true; captureRect = null; dragStart = null; captureBusy = false; $('panel').hidden = false; move(); }
  function beginCapture() {
    dismiss(false); captureRect = { x: Math.max(0, Math.round((innerWidth - 320) / 2)), y: Math.max(0, Math.round((innerHeight - 180) / 2)), width: Math.min(320, innerWidth), height: Math.min(180, innerHeight) };
    $('capture-layer').hidden = false; drawCaptureRect(); $('capture-layer').focus();
  }
  function elementLocator(element) {
    if (!(element instanceof Element) || element === document.documentElement) return '';
    const parts = [];
    for (let node = element; node && node !== document.documentElement && parts.length < 8; node = node.parentElement) {
      const siblings = [...(node.parentElement?.children || [])].filter(child => child.tagName === node.tagName);
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
    }
    return parts.join(' > ').slice(0, 500);
  }
  async function cropScreenshot(source, rect) {
    let image;
    try {
      const bytes = Uint8Array.from(atob(source.split(',')[1]), char => char.charCodeAt(0));
      image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    } catch { throw new Error('The screenshot could not be prepared. Try again.'); }
    try {
      const scaleX = image.width / innerWidth, scaleY = image.height / innerHeight;
      const x = Math.round(rect.x * scaleX), y = Math.round(rect.y * scaleY);
      const width = Math.min(image.width - x, Math.round(rect.width * scaleX));
      const height = Math.min(image.height - y, Math.round(rect.height * scaleY));
      if (width < 1 || height < 1) throw new Error('empty');
      const canvas = document.createElement('canvas');
      let factor = Math.min(1, 1400 / width, 1000 / height);
      for (let round = 0; round < 6; round++) {
        canvas.width = Math.max(1, Math.round(width * factor)); canvas.height = Math.max(1, Math.round(height * factor));
        canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
        for (const quality of [.86, .72, .58]) {
          let output = canvas.toDataURL('image/webp', quality);
          if (!output.startsWith('data:image/webp;')) output = canvas.toDataURL('image/jpeg', quality);
          if (output.length <= 650_000) return output;
        }
        factor *= .8;
      }
      throw new Error('large');
    } catch { throw new Error('The selected image is too large. Try a smaller area.'); }
    finally { image.close?.(); }
  }
  async function finishCapture() {
    if (captureBusy || !captureRect || captureRect.width < 12 || captureRect.height < 12) return;
    captureBusy = true;
    const rect = { ...captureRect }; $('capture-layer').hidden = true;
    host.style.setProperty('visibility', 'hidden', 'important');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const shot = await send('neo:checkpoint-capture');
    host.style.removeProperty('visibility');
    $('panel').hidden = false; captureBusy = false;
    if (!shot?.ok) { $('message').textContent = shot?.error || 'Capture failed. Try again.'; showView('capture'); move(); return; }
    try { previewImage = await cropScreenshot(shot.image, rect); }
    catch (error) { $('message').textContent = error.message; showView('capture'); return; }
    const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const targetRect = center instanceof Element ? center.getBoundingClientRect() : null;
    previewRect = { ...rect, x: rect.x + scrollX, y: rect.y + scrollY, scrollX, scrollY, locator: elementLocator(center), locatorOffsetX: targetRect ? rect.x - targetRect.left : 0, locatorOffsetY: targetRect ? rect.y - targetRect.top : 0 };
    $('capture-preview').src = previewImage; $('capture-name').value = `Checkpoint · ${new Date().toLocaleString()}`; $('capture-form').hidden = false;
    $('message').textContent = 'Review your capture, then save it.'; showView('capture'); $('capture-name').focus();
  }

  async function send(type, data = {}) {
    try { return await chrome.runtime.sendMessage({ type, ...data }); }
    catch { return { ok: false, error: 'Neo was updated. Refresh this page to reconnect.' }; }
  }
  function applySettings(value) {
    settings = { ...NEO_CONFIG.defaults, ...value };
    host.hidden = !settings.enabled;
    host.style.setProperty('display', settings.enabled ? 'block' : 'none', 'important');
    if (settings.enabled) host.removeAttribute('aria-hidden'); else host.setAttribute('aria-hidden', 'true');
    $('chat-mode').textContent = settings.aiEnabled ? 'AI enabled · Chat and attachments go to OpenAI.' : 'Local help · AI chat is off';
    if (!settings.enabled) { dismiss(false); clearHighlight(); }
    if (!settings.proactive || settings.snoozeUntil > Date.now() || localSnoozeUntil > Date.now()) { if (automatic) dismiss(false); }
    move();
  }
  async function refresh() {
    const revision = settingsRevision, request = ++refreshRevision;
    const state = await send('neo:state');
    if (!state?.ok || abort.signal.aborted || request !== refreshRevision) return;
    const changedTask = task?.pinnedAt !== state.task?.pinnedAt;
    task = state.task; isTaskTab = state.isTaskTab;
    if (changedTask) { awayOnTaskSince = null; driftNudged = false; }
    // A storage event or local action may have happened while this request was in flight.
    if (revision === settingsRevision) applySettings(state.settings);
    ready = true;
    $('return-task').hidden = !task || isTaskTab;
    $('restore').hidden = !task;
  }
  function move() {
    if (abort.signal.aborted) return;
    const x = settings.followCursor && hasPointer ? pointer.x + 24 : innerWidth - 68;
    const y = settings.followCursor && hasPointer ? pointer.y + 20 : innerHeight - 70;
    const left = Math.max(8, Math.min(x, innerWidth - 50));
    const top = Math.max(8, Math.min(y, innerHeight - 50));
    $('mascot').style.left = `${left}px`; $('mascot').style.top = `${top}px`;
    const width = Math.min(380, innerWidth - 24);
    const height = $('panel').getBoundingClientRect().height || 330;
    $('panel').style.left = `${Math.max(12, Math.min(left - width - 12, innerWidth - width - 12))}px`;
    $('panel').style.top = `${Math.max(12, Math.min(top - 20, innerHeight - height - 12))}px`;
  }
  function open(message, reason, auto = false) {
    if (!settings.enabled) return;
    automatic = auto; openedAt = Date.now();
    if ($('panel').hidden) previousFocus = document.activeElement;
    $('message').textContent = message; $('reason').textContent = reason;
    $('chat-section').open = true;
    $('reading').hidden = true; $('panel').hidden = false;
    root.querySelector('.neo').classList.add('opened'); $('mascot').setAttribute('aria-expanded', 'true');
    showView(auto && task ? 'saved' : 'chat'); move();
    if (!auto) $('close').focus({ preventScroll: true });
  }
  function summon() {
    if (!settings.enabled) return;
    // Selection is read only when requested; never capture field contents or send text away.
    selection = pageSelection();
    open('I’m here. What would make this moment easier?', 'Choose an action, or talk to me below.');
    refresh();
  }
  function dismiss(restoreFocus = true) {
    const wasOpen = !$('panel').hidden;
    $('panel').hidden = true; root.querySelector('.neo').classList.remove('opened'); $('mascot').setAttribute('aria-expanded', 'false');
    selecting = false; selection = ''; $('reading').textContent = ''; lastNudge = Date.now();
    if (wasOpen && restoreFocus && !automatic && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    automatic = false;
  }
  function nudge(message, reason) {
    if (!ready || !settings.enabled || !settings.proactive || settings.snoozeUntil > Date.now() || localSnoozeUntil > Date.now() || document.hidden || !document.hasFocus() || !$('panel').hidden || Date.now() - lastNudge < timing().cooldown) return false;
    lastNudge = Date.now(); open(message, reason, true); return true;
  }
  function placeHighlight() {
    if (!highlight?.isConnected && !highlightRect) { clearHighlight(); return; }
    const rect = highlightRect ? { left: highlightRect.x - scrollX, top: highlightRect.y - scrollY, width: highlightRect.width, height: highlightRect.height, bottom: highlightRect.y - scrollY + highlightRect.height } : highlight.getBoundingClientRect();
    $('highlight').hidden = rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > innerHeight;
    Object.assign($('highlight').style, { left: `${rect.left - 5}px`, top: `${rect.top - 5}px`, width: `${rect.width + 10}px`, height: `${rect.height + 10}px` });
  }
  function mark(target, dim = false) {
    if (!target?.isConnected) return;
    highlight = target; highlightRect = null; spotlight = dim; $('highlight').classList.toggle('spotlight', dim); $('clear-focus').hidden = false; placeHighlight();
  }
  function clearHighlight() { highlight = null; highlightRect = null; spotlight = false; $('highlight').hidden = true; $('clear-focus').hidden = true; }
  function restorePlace(checkpoint = task) {
    if (!checkpoint) { $('message').textContent = 'Capture an area first.'; return; }
    let target = null;
    try { if (checkpoint.locator) target = document.querySelector(checkpoint.locator); } catch { /* Page structure changed. */ }
    const top = target ? target.getBoundingClientRect().top + scrollY + (checkpoint.locatorOffsetY || 0) : checkpoint.rect.y;
    const left = target ? target.getBoundingClientRect().left + scrollX + (checkpoint.locatorOffsetX || 0) : checkpoint.rect.x;
    window.scrollTo({ top: Math.max(0, top - innerHeight * .35), left: Math.max(0, left - innerWidth * .35), behavior: 'instant' });
    highlightRect = { ...checkpoint.rect, x: left, y: top }; highlight = null; spotlight = false; $('highlight').classList.remove('spotlight'); placeHighlight();
    open(target ? 'Here is your checkpoint.' : 'Here is the saved position. This page may have changed.', 'Your screenshot is available in Saved.'); showView('saved');
  }

  listen($('mascot'), 'click', () => $('panel').hidden ? summon() : dismiss());
  listen($('close'), 'click', () => dismiss());
  for (const view of ['capture', 'saved', 'chat', 'plan']) listen($(`tab-${view}`), 'click', () => { automatic = false; showView(view); if (view === 'plan') loadWork(); });
  listen($('hold'), 'click', beginCapture);
  listen($('capture-layer'), 'pointerdown', event => {
    event.preventDefault(); dragStart = { x: event.clientX, y: event.clientY }; captureRect = { x: event.clientX, y: event.clientY, width: 0, height: 0 };
    $('capture-layer').setPointerCapture?.(event.pointerId); drawCaptureRect();
  });
  listen($('capture-layer'), 'pointermove', event => {
    if (!dragStart) return;
    const x = Math.max(0, Math.min(innerWidth, event.clientX)), y = Math.max(0, Math.min(innerHeight, event.clientY));
    captureRect = { x: Math.min(dragStart.x, x), y: Math.min(dragStart.y, y), width: Math.abs(x - dragStart.x), height: Math.abs(y - dragStart.y) }; drawCaptureRect();
  });
  listen($('capture-layer'), 'pointerup', event => { if (!dragStart) return; dragStart = null; $('capture-layer').releasePointerCapture?.(event.pointerId); finishCapture(); });
  listen($('capture-layer'), 'keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); cancelCapture(); return; }
    if (event.key === 'Enter') { event.preventDefault(); finishCapture(); return; }
    const offsets = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    if (!offsets[event.key]) return;
    event.preventDefault(); const [dx, dy] = offsets[event.key];
    if (event.shiftKey) { captureRect.width = Math.max(12, Math.min(innerWidth - captureRect.x, captureRect.width + dx)); captureRect.height = Math.max(12, Math.min(innerHeight - captureRect.y, captureRect.height + dy)); }
    else { captureRect.x = Math.max(0, Math.min(innerWidth - captureRect.width, captureRect.x + dx)); captureRect.y = Math.max(0, Math.min(innerHeight - captureRect.height, captureRect.y + dy)); }
    drawCaptureRect();
  });
  listen($('capture-form'), 'submit', async event => {
    event.preventDefault();
    if (!previewImage || !previewRect) return;
    $('save-checkpoint').disabled = true;
    const result = await send('neo:checkpoint-save', { name: $('capture-name').value, image: previewImage, rect: { x: previewRect.x, y: previewRect.y, width: previewRect.width, height: previewRect.height }, scrollX: previewRect.scrollX, scrollY: previewRect.scrollY, locator: previewRect.locator, locatorOffsetX: previewRect.locatorOffsetX, locatorOffsetY: previewRect.locatorOffsetY });
    $('save-checkpoint').disabled = false;
    if (!result?.ok) { $('message').textContent = result?.error || 'Could not save this checkpoint.'; return; }
    previewImage = ''; previewRect = null; $('capture-form').hidden = true; $('capture-preview').removeAttribute('src');
    await loadCheckpoints(); await refresh(); $('message').textContent = 'Checkpoint saved. Return to it from Saved.'; showView('saved');
  });
  listen($('cancel-preview'), 'click', () => { previewImage = ''; previewRect = null; $('capture-form').hidden = true; $('capture-preview').removeAttribute('src'); $('message').textContent = 'Capture cancelled.'; });
  listen($('restore'), 'click', async () => { const result = await send('neo:checkpoint-return'); if (!result?.ok) $('message').textContent = result?.error || 'Could not return to this checkpoint.'; });
  listen($('focus'), 'click', () => {
    selecting = true;
    focusCandidates = [...document.querySelectorAll('p,li,h1,h2,h3,label,input:not([type=password]):not([type=hidden]),textarea,select,button')].filter(el => !host.contains(el) && el.getClientRects().length && !el.closest('[hidden],[aria-hidden=true]')).slice(0, 500);
    focusIndex = Math.max(0, focusCandidates.indexOf(lastTarget));
    if (focusCandidates.length) mark(focusCandidates[focusIndex], true);
    $('message').textContent = 'Click an area, or use arrow keys to choose and Enter to focus. Escape cancels.';
  });
  listen($('clear-focus'), 'click', clearHighlight);
  listen($('return-task'), 'click', async () => { const result = await send('neo:checkpoint-return'); if (result?.ok) dismiss(false); else { $('message').textContent = result?.error || 'Choose a checkpoint to return to.'; await refresh(); } });
  listen($('read'), 'click', () => {
    selection = pageSelection() || selection;
    if (!selection.trim()) { $('message').textContent = 'Select text on the page, then press Alt+Shift+N. I can space it into smaller parts.'; return; }
    $('message').textContent = 'Your selected words, with more room between sentences.';
    $('reason').textContent = 'Reading aid · Original text, not an AI explanation.';
    $('reading').textContent = selection.replace(/([.!?])\s+/g, '$1\n\n'); $('reading').hidden = false; move();
  });
  function chatLine(role, text, label) {
    const line = document.createElement('div'); line.className = `chat-line ${role}`;
    const title = document.createElement('span'); title.className = 'chat-label'; title.textContent = label || (role === 'user' ? 'You' : 'Neo');
    line.append(title, document.createTextNode(text)); $('chat-log').append(line);
    while ($('chat-log').children.length > 24) $('chat-log').firstElementChild.remove();
    $('chat-log').scrollTop = $('chat-log').scrollHeight; move();
  }
  listen($('attach'), 'click', () => {
    if (attachment) { attachment = ''; $('attachment').hidden = true; $('attach').textContent = 'Attach selection'; return; }
    selection = pageSelection() || selection;
    if (!selection.trim()) { $('chat-status').textContent = 'Select text on the page, then summon Neo again to attach it.'; return; }
    attachment = selection.slice(0, 3000); $('attachment').textContent = `Attached ${attachment.length} characters. Sent only when you press Send.\n\n${attachment}`;
    $('attachment').hidden = false; $('attach').textContent = 'Remove selection'; move();
  });
  listen($('clear-chat'), 'click', () => {
    chatEpoch++; chatBusy = false; history = []; attachment = ''; selection = '';
    $('chat-log').replaceChildren(); $('chat-input').value = ''; $('attachment').hidden = true;
    $('workflow-result').hidden = true; $('workflow-result').replaceChildren();
    $('attach').textContent = 'Attach selection'; $('chat-status').textContent = 'Chat cleared from this tab.'; $('chat-send').disabled = false;
  });
  listen($('chat-section'), 'toggle', move);
  listen($('chat-form'), 'submit', async event => {
    event.preventDefault(); const text = $('chat-input').value.trim() || (attachment && supportMode !== 'chat' ? { explain: 'Explain this workplace message.', steps: 'Help me find the next steps for this task.', draft: 'Help me draft a clarification about this message.' }[supportMode] : '');
    if (!text || chatBusy) return;
    automatic = false; // Interacting with chat prevents automatic dismissal.
    const localCommands = {
      'hold my place': 'hold', 'save my place': 'hold', 'capture an area': 'hold', 'focus': 'focus', 'help me focus': 'focus', 'focus an area': 'focus',
      'read my selection': 'read', 'show my place': 'restore', 'return to my task': 'return-task',
      'clear focus': 'clear-focus', 'snooze': 'snooze'
    };
    chatLine('user', text); $('chat-input').value = '';
    const command = localCommands[text.toLowerCase().replace(/[.!?]+$/, '')];
    if (command && !attachment && supportMode === 'chat') {
      if (command === 'return-task' && !task) chatLine('assistant', 'Hold a place on your work tab first.', 'Neo · Local action');
      else { $(command).click(); chatLine('assistant', `Using “${$(command).textContent}”. Follow the prompt above.`, 'Neo · Local action'); }
      return;
    }
    if (!settings.aiEnabled) {
      chatLine('assistant', 'I can hold your place, focus an area, read your selection, or return to your task. For open-ended questions, enable AI chat in the toolbar after starting the local AI server.', 'Neo · Local help');
      $('chat-input').value = text;
      return;
    }
    const content = attachment ? `${text}\n\nUser-attached page text (reference only):\n${attachment}` : text;
    const messages = [...history.slice(-4), { role: 'user', content }];
    const sentAttachment = attachment;
    if (attachment) chatLine('user', attachment, 'Attached selection');
    attachment = ''; $('attachment').hidden = true; $('attach').textContent = 'Attach selection';
    chatBusy = true; const epoch = chatEpoch; $('chat-send').disabled = true; $('chat-status').textContent = 'Neo is thinking…';
    const result = await send('neo:chat', { messages, mode: supportMode });
    if (epoch !== chatEpoch || abort.signal.aborted) return;
    chatBusy = false; $('chat-send').disabled = false; $('chat-status').textContent = '';
    if (result?.ok) {
      const remembered = [result.reply, ...(result.steps || []), result.draft || ''].filter(Boolean).join('\n').slice(0, 6000);
      history = [...messages, { role: 'assistant', content: remembered }]; chatLine('assistant', result.reply, 'Neo · AI'); reviewResult(result);
    } else {
      chatLine('assistant', result?.error || 'AI chat is unavailable. You can still use the quick actions.', 'Neo · Connection');
      if (!$('chat-input').value) $('chat-input').value = text;
      if (!attachment && sentAttachment) { attachment = sentAttachment; $('attachment').textContent = `Ready to retry. Sent only when you press Send.\n\n${attachment}`; $('attachment').hidden = false; $('attach').textContent = 'Remove selection'; }
      $('chat-status').textContent = 'Your request is kept here. Send again when the connection is ready.';
    }
  });
  listen($('snooze'), 'click', async () => {
    const deadline = Date.now() + 10 * 60_000;
    settingsRevision++; localSnoozeUntil = deadline; settings.snoozeUntil = deadline;
    // Close immediately; persistence should never keep the assistant open or block the page.
    dismiss();
    try {
      const current = await chrome.storage.local.get('neoSettings');
      await chrome.storage.local.set({ neoSettings: { ...NEO_CONFIG.defaults, ...current.neoSettings, snoozeUntil: deadline } });
    } catch { $('message').textContent = 'Quiet on this page for 10 minutes. Refresh to reconnect Neo.'; }
  });
  listen(document, 'pointermove', event => {
    if (inNeo(event) || !$('panel').hidden || !$('capture-layer').hidden || event.buttons || root.activeElement === $('mascot')) return;
    lastTarget = anchor(event.target);
    // Let the user reach and click Neo instead of making the mascot chase the pointer.
    const box = $('mascot').getBoundingClientRect();
    if (hasPointer && Math.hypot(event.clientX - box.left - 21, event.clientY - box.top - 21) < 65) return;
    pointer = { x: event.clientX, y: event.clientY }; hasPointer = true;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; move(); });
  }, { passive: true });
  listen(document, 'pointerdown', event => {
    if (inNeo(event)) return;
    lastTarget = anchor(event.target);
    if (selecting) { event.preventDefault(); event.stopImmediatePropagation(); selecting = false; mark(lastTarget, true); $('message').textContent = 'Just this area. Press Escape or “Clear focus” to restore the page.'; return; }
    if (!$('panel').hidden) dismiss(false);
  }, { capture: true });
  listen(document, 'keydown', event => {
    if (selecting && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') { selecting = false; clearHighlight(); $('message').textContent = 'Focus selection cancelled.'; return; }
      if (!focusCandidates.length) { $('message').textContent = 'No readable areas found here. You can still click an area.'; return; }
      if (event.key === 'Enter') { selecting = false; $('message').textContent = 'Area focused. Escape or Clear focus restores the page.'; return; }
      focusIndex = (focusIndex + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + focusCandidates.length) % focusCandidates.length;
      focusCandidates[focusIndex].scrollIntoView({ block: 'center', behavior: 'instant' }); mark(focusCandidates[focusIndex], true); return;
    }
    if (event.key === 'Escape' && (!$('panel').hidden || highlight || highlightRect)) { dismiss(); clearHighlight(); }
    if (event.target === field && !inNeo(event)) fieldActivity = Date.now();
  }, { capture: true });
  listen(document, 'focusin', event => {
    if (inNeo(event)) return;
    if (editable(event.target)) { field = event.target; fieldActivity = Date.now(); fieldNudged = false; lastTarget = anchor(field); }
    else field = null;
    if (spotlight && field) mark(anchor(field), true);
  });
  listen(document, 'input', event => { if (event.target === field) fieldActivity = Date.now(); });
  listen(document, 'visibilitychange', async () => {
    if (document.hidden) { awaySince = Date.now(); awayOnTaskSince = null; driftNudged = false; return; }
    visibleSince = Date.now(); deepFocusNudged = false; fieldActivity = Date.now();
    await refresh();
    if (task && isTaskTab && awaySince !== null && Date.now() - awaySince >= timing().drift) {
      nudge('Welcome back. Your checkpoint is saved.', 'Open Saved to see where you stopped.');
    }
    awaySince = null;
  });
  listen(window, 'focus', () => { visibleSince = Date.now(); fieldActivity = Date.now(); refresh(); });
  listen(window, 'blur', () => { awayOnTaskSince = null; });
  listen(window, 'resize', () => { move(); if (highlight || highlightRect) placeHighlight(); });
  listen(document, 'scroll', () => { if (highlight || highlightRect) placeHighlight(); }, { capture: true, passive: true });
  const tick = setInterval(() => {
    if (!ready || document.hidden || !document.hasFocus()) return;
    if (highlight || highlightRect) placeHighlight();
    const now = Date.now();
    if (automatic && Number(settings.promptSeconds) > 0 && now - openedAt > Number(settings.promptSeconds) * 1000 && !root.activeElement && !$('panel').matches(':hover')) dismiss(false);
    if (task && !isTaskTab) {
      if (awayOnTaskSince === null) awayOnTaskSince = now;
      if (!driftNudged && now - awayOnTaskSince >= timing().drift) driftNudged = nudge('Still working on your pinned task? I can take you back.', `You’ve spent ${settings.demoMode ? '8 seconds (demo)' : `${timing().drift / 60000} minutes`} in another tab.`);
    }
    if (!fieldNudged && field && document.activeElement === field && now - fieldActivity >= timing().fieldPause) {
      fieldNudged = nudge('Would focusing on just this field help?', `No typing in this field for ${settings.demoMode ? '12' : '45'} seconds.`);
    }
    if (!deepFocusNudged && now - visibleSince >= timing().deepFocus) {
      deepFocusNudged = nudge('Would you like a short pause? Your place can stay here.', `${settings.demoMode ? '20 seconds (demo)' : `${timing().deepFocus / 60000} minutes`} in this tab.`);
    }
  }, 1000);
  const storageListener = (changes, area) => {
    if (area === 'local' && changes.neoSettings) {
      settingsRevision++;
      localSnoozeUntil = changes.neoSettings.newValue?.snoozeUntil || 0;
      const wasDemo = settings.demoMode; applySettings(changes.neoSettings.newValue);
      if (settings.demoMode !== wasDemo) { visibleSince = Date.now(); awayOnTaskSince = null; fieldActivity = Date.now(); deepFocusNudged = fieldNudged = driftNudged = false; lastNudge = -Infinity; }
    }
    if (area === 'local' && (changes.neoCheckpoints || changes.neoActiveCheckpointId)) { loadCheckpoints(); refresh(); }
    if (area === 'local' && changes.neoWorkState) loadWork();
  };
  const messageListener = (message, sender, respond) => {
    if (message?.type === 'neo:summon') { summon(); respond({ ok: true }); }
    if (message?.type === 'neo:capture') { summon(); beginCapture(); respond({ ok: true }); }
    if (message?.type === 'neo:show-saved') { summon(); showView('saved'); respond({ ok: true }); }
    if (message?.type === 'neo:checkpoint-restore') { restorePlace(message.checkpoint); respond({ ok: true }); }
  };
  chrome.storage.onChanged.addListener(storageListener);
  chrome.runtime.onMessage.addListener(messageListener);
  listen(document, 'neo-companion-dispose', () => {
    abort.abort(); clearInterval(tick); cancelAnimationFrame(frame); host.remove();
    try { chrome.storage.onChanged.removeListener(storageListener); chrome.runtime.onMessage.removeListener(messageListener); } catch { /* Old extension context already unloaded. */ }
  });
  move();
  Promise.all([refresh(), loadCheckpoints(), loadWork()]).then(async () => {
    const pending = await send('neo:pending-restore');
    if (pending?.checkpoint) restorePlace(pending.checkpoint);
  });
})();
