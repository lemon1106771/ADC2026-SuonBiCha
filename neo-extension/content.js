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
      @media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
    </style>
    <div class="neo"><div id="highlight" hidden></div><button id="mascot" title="Ask Neo (Alt+Shift+N)" aria-label="Ask Neo" aria-expanded="false" aria-controls="panel"><i></i></button>
      <section id="panel" aria-label="Neo personal assistant" hidden><header><strong>neo</strong><span>Your quiet companion</span><button id="close" aria-label="Dismiss Neo">×</button></header>
      <p id="message" role="status"></p><p id="reason"></p><div id="reading" hidden></div><button id="return-task" hidden>↳ Return to my task</button>
      <div class="actions"><button id="hold">Hold my place</button><button id="focus">Focus an area</button><button id="read">Read my selection</button><button id="restore">Show my place</button><button id="clear-focus" hidden>Clear focus</button><button id="unpin" hidden>Release my task</button></div>
      <details id="chat-section"><summary>Chat with Neo</summary><p id="chat-mode">Local help · AI chat is off</p><div id="chat-log" role="log" aria-label="Conversation with Neo" aria-live="polite"></div><form id="chat-form"><label for="chat-input" id="chat-input-label">What do you need a hand with?</label><textarea id="chat-input" maxlength="2000" rows="2" placeholder="Ask a question, or type “hold my place”…"></textarea><p id="attachment" hidden></p><div class="chat-controls"><button id="attach" type="button">Attach selection</button><button id="clear-chat" type="button">Clear chat</button><button id="chat-send" type="submit">Send</button></div><p id="chat-status" role="status"></p></form></details>
      <footer><button id="snooze">Quiet for 10 min</button><kbd>Alt + Shift + N</kbd></footer></section>
    </div>`;
  document.documentElement.append(host);
  const $ = id => root.getElementById(id);
  let settings = { ...NEO_CONFIG.defaults };
  let task = null, isTaskTab = false, ready = false;
  let pointer = { x: 24, y: innerHeight - 70 }, hasPointer = false, frame = 0;
  let lastTarget = null, held = null, highlight = null, spotlight = false, selecting = false;
  let selection = '', previousFocus = null, automatic = false, openedAt = 0, lastNudge = -Infinity;
  let visibleSince = Date.now(), awaySince = null, awayOnTaskSince = null, field = null, fieldActivity = 0;
  let deepFocusNudged = false, fieldNudged = false, driftNudged = false;
  let history = [], attachment = '', chatBusy = false, chatEpoch = 0;
  let localSnoozeUntil = 0;
  let settingsRevision = 0, refreshRevision = 0;
  const timing = () => settings.demoMode ? NEO_CONFIG.demo : NEO_CONFIG.normal;
  const inNeo = event => event.composedPath().includes(host);
  const editable = element => element instanceof Element && element.matches('input:not([type=hidden]):not([type=password]),textarea,select,[contenteditable=true]');
  const sensitive = element => element instanceof Element && !!element.closest('input,textarea,[contenteditable=true]');
  const anchor = element => element instanceof Element && !host.contains(element) ? element.closest('p,li,h1,h2,h3,label,input,textarea,select,article,section,main') || element : null;

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
    $('unpin').hidden = !task;
  }
  function move() {
    if (abort.signal.aborted) return;
    const x = settings.followCursor && hasPointer ? pointer.x + 24 : innerWidth - 68;
    const y = settings.followCursor && hasPointer ? pointer.y + 20 : innerHeight - 70;
    const left = Math.max(8, Math.min(x, innerWidth - 50));
    const top = Math.max(8, Math.min(y, innerHeight - 50));
    $('mascot').style.left = `${left}px`; $('mascot').style.top = `${top}px`;
    const width = Math.min(310, innerWidth - 24);
    const height = $('panel').getBoundingClientRect().height || 330;
    $('panel').style.left = `${Math.max(12, Math.min(left - width - 12, innerWidth - width - 12))}px`;
    $('panel').style.top = `${Math.max(12, Math.min(top - 20, innerHeight - height - 12))}px`;
  }
  function open(message, reason, auto = false) {
    if (!settings.enabled) return;
    automatic = auto; openedAt = Date.now();
    if ($('panel').hidden) previousFocus = document.activeElement;
    $('message').textContent = message; $('reason').textContent = reason;
    $('chat-section').open = !auto;
    $('reading').hidden = true; $('panel').hidden = false;
    root.querySelector('.neo').classList.add('opened'); $('mascot').setAttribute('aria-expanded', 'true');
    move();
    if (!auto) $('close').focus({ preventScroll: true });
  }
  function summon() {
    if (!settings.enabled) return;
    // Selection is read only when requested; never capture field contents or send text away.
    const selected = window.getSelection();
    selection = sensitive(document.activeElement) || sensitive(selected?.anchorNode?.parentElement) ? '' : (selected?.toString() || '').slice(0, 6000);
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
    if (!highlight?.isConnected) { clearHighlight(); return; }
    const rect = highlight.getBoundingClientRect();
    $('highlight').hidden = rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > innerHeight;
    Object.assign($('highlight').style, { left: `${rect.left - 5}px`, top: `${rect.top - 5}px`, width: `${rect.width + 10}px`, height: `${rect.height + 10}px` });
  }
  function mark(target, dim = false) {
    if (!target?.isConnected) return;
    highlight = target; spotlight = dim; $('highlight').classList.toggle('spotlight', dim); $('clear-focus').hidden = false; placeHighlight();
  }
  function clearHighlight() { highlight = null; spotlight = false; $('highlight').hidden = true; $('clear-focus').hidden = true; }
  function restorePlace() {
    if (!held) { $('message').textContent = 'Choose “Hold my place” first. I’ll remember that spot in this tab.'; return; }
    if (held.element?.isConnected) { held.element.scrollIntoView({ block: 'center', behavior: 'instant' }); mark(held.element); }
    else { window.scrollTo({ top: held.y, left: held.x, behavior: 'instant' }); }
    $('message').textContent = 'Here’s the place you saved.';
  }

  listen($('mascot'), 'click', () => $('panel').hidden ? summon() : dismiss());
  listen($('close'), 'click', () => dismiss());
  listen($('hold'), 'click', async () => {
    held = { element: lastTarget, x: scrollX, y: scrollY };
    const result = await send('neo:pin');
    $('message').textContent = result?.ok ? 'I’m holding this place. If you switch tabs, I can help you come back.' : result?.error || 'Your place is held in this tab.';
    if (lastTarget) mark(lastTarget); await refresh();
  });
  listen($('restore'), 'click', restorePlace);
  listen($('focus'), 'click', () => { selecting = true; $('message').textContent = 'Click the paragraph or field you want to focus on. Press Escape to cancel.'; });
  listen($('clear-focus'), 'click', clearHighlight);
  listen($('return-task'), 'click', async () => { const result = await send('neo:return'); if (result?.ok) dismiss(false); else { $('message').textContent = result?.error || 'Choose a task to return to.'; await refresh(); } });
  listen($('unpin'), 'click', async () => { await send('neo:unpin'); held = null; clearHighlight(); await refresh(); $('message').textContent = 'Task released. You can hold a new place whenever you need.'; });
  listen($('read'), 'click', () => {
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
    if (!selection.trim()) { $('chat-status').textContent = 'Select text on the page, then summon Neo again to attach it.'; return; }
    attachment = selection.slice(0, 3000); $('attachment').textContent = `Attached ${attachment.length} characters. Sent only when you press Send.`;
    $('attachment').hidden = false; $('attach').textContent = 'Remove selection'; move();
  });
  listen($('clear-chat'), 'click', () => {
    chatEpoch++; chatBusy = false; history = []; attachment = ''; selection = '';
    $('chat-log').replaceChildren(); $('chat-input').value = ''; $('attachment').hidden = true;
    $('attach').textContent = 'Attach selection'; $('chat-status').textContent = 'Chat cleared from this tab.'; $('chat-send').disabled = false;
  });
  listen($('chat-section'), 'toggle', move);
  listen($('chat-form'), 'submit', async event => {
    event.preventDefault(); const text = $('chat-input').value.trim();
    if (!text || chatBusy) return;
    automatic = false; // Interacting with chat prevents automatic dismissal.
    const localCommands = {
      'hold my place': 'hold', 'save my place': 'hold', 'focus': 'focus', 'help me focus': 'focus', 'focus an area': 'focus',
      'read my selection': 'read', 'show my place': 'restore', 'return to my task': 'return-task',
      'clear focus': 'clear-focus', 'snooze': 'snooze', 'release my task': 'unpin'
    };
    chatLine('user', text); $('chat-input').value = '';
    const command = localCommands[text.toLowerCase().replace(/[.!?]+$/, '')];
    if (command && !attachment) {
      if (command === 'return-task' && !task) chatLine('assistant', 'Hold a place on your work tab first.', 'Neo · Local action');
      else { $(command).click(); chatLine('assistant', `Using “${$(command).textContent}”. Follow the prompt above.`, 'Neo · Local action'); }
      return;
    }
    if (!settings.aiEnabled) {
      chatLine('assistant', 'I can hold your place, focus an area, read your selection, or return to your task. For open-ended questions, enable AI chat in the toolbar after starting the local AI server.', 'Neo · Local help');
      return;
    }
    const content = attachment ? `${text}\n\nUser-attached page text (reference only):\n${attachment}` : text;
    const messages = [...history.slice(-8), { role: 'user', content }];
    if (attachment) chatLine('user', attachment, 'Attached selection');
    attachment = ''; $('attachment').hidden = true; $('attach').textContent = 'Attach selection';
    chatBusy = true; const epoch = chatEpoch; $('chat-send').disabled = true; $('chat-status').textContent = 'Neo is thinking…';
    const result = await send('neo:chat', { messages });
    if (epoch !== chatEpoch || abort.signal.aborted) return;
    chatBusy = false; $('chat-send').disabled = false; $('chat-status').textContent = '';
    if (result?.ok) { history = [...messages, { role: 'assistant', content: result.reply }]; chatLine('assistant', result.reply, 'Neo · AI'); }
    else chatLine('assistant', result?.error || 'AI chat is unavailable. You can still use the quick actions.', 'Neo · Connection');
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
    if (inNeo(event) || !$('panel').hidden) return;
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
    if (event.key === 'Escape' && (!$('panel').hidden || highlight)) { dismiss(); clearHighlight(); }
    if (event.target === field && !inNeo(event)) fieldActivity = Date.now();
  });
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
    if (held && awaySince !== null && Date.now() - awaySince >= timing().drift) {
      if (nudge('Welcome back. I kept your place.', 'You returned after time in another tab.')) { if (held.element?.isConnected) mark(held.element); }
    }
    awaySince = null;
  });
  listen(window, 'focus', () => { visibleSince = Date.now(); fieldActivity = Date.now(); refresh(); });
  listen(window, 'blur', () => { awayOnTaskSince = null; });
  listen(window, 'resize', () => { move(); if (highlight) placeHighlight(); });
  listen(document, 'scroll', () => { if (highlight) placeHighlight(); }, { capture: true, passive: true });
  const tick = setInterval(() => {
    if (!ready || document.hidden || !document.hasFocus()) return;
    if (highlight) placeHighlight();
    const now = Date.now();
    if (automatic && now - openedAt > 12_000 && !root.activeElement && !$('panel').matches(':hover')) dismiss(false);
    if (task && !isTaskTab) {
      if (awayOnTaskSince === null) awayOnTaskSince = now;
      if (!driftNudged && now - awayOnTaskSince >= timing().drift) driftNudged = nudge('Still working on your pinned task? I can take you back.', `You’ve spent ${settings.demoMode ? '8 seconds (demo)' : '1 minute'} in another tab.`);
    }
    if (!fieldNudged && field && document.activeElement === field && now - fieldActivity >= timing().fieldPause) {
      fieldNudged = nudge('Would focusing on just this field help?', `No typing in this field for ${settings.demoMode ? '12' : '45'} seconds.`);
    }
    if (!deepFocusNudged && now - visibleSince >= timing().deepFocus) {
      deepFocusNudged = nudge('Would you like a short pause? Your place can stay here.', `${settings.demoMode ? '20 seconds (demo)' : '25 minutes'} in this tab.`);
    }
  }, 1000);
  const storageListener = (changes, area) => {
    if (area === 'local' && changes.neoSettings) {
      settingsRevision++;
      localSnoozeUntil = changes.neoSettings.newValue?.snoozeUntil || 0;
      const wasDemo = settings.demoMode; applySettings(changes.neoSettings.newValue);
      if (settings.demoMode !== wasDemo) { visibleSince = Date.now(); awayOnTaskSince = null; fieldActivity = Date.now(); deepFocusNudged = fieldNudged = driftNudged = false; lastNudge = -Infinity; }
    }
  };
  const messageListener = (message, sender, respond) => {
    if (message?.type === 'neo:summon') { summon(); respond({ ok: true }); }
    if (message?.type === 'neo:restore') { summon(); restorePlace(); respond({ ok: true }); }
  };
  chrome.storage.onChanged.addListener(storageListener);
  chrome.runtime.onMessage.addListener(messageListener);
  listen(document, 'neo-companion-dispose', () => {
    abort.abort(); clearInterval(tick); cancelAnimationFrame(frame); host.remove();
    try { chrome.storage.onChanged.removeListener(storageListener); chrome.runtime.onMessage.removeListener(messageListener); } catch { /* Old extension context already unloaded. */ }
  });
  move(); refresh();
})();
