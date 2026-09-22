'use strict';
// All tabs mutate the same local plan through the worker, in order.
let workWrites = Promise.resolve();
globalThis.neoWork = message => {
  const operation = workWrites.then(async () => {
    const { neoWorkState } = await chrome.storage.local.get('neoWorkState');
    const state = neoWorkState || { steps: [], activeId: null, draft: '', draftRevision: 0, removed: null, previousDraft: null };
    if (message.action === 'get') return { ok: true, state };
    if (message.action === 'add') {
      if (!Array.isArray(message.steps) || !message.steps.length || message.steps.length > 12 || message.steps.some(s => typeof s !== 'string' || !s.trim() || s.length > 500)) return { ok: false, error: 'Use 1–12 steps, up to 500 characters each.' };
      if (state.steps.length + message.steps.length > 60) return { ok: false, error: 'Your plan holds 60 steps. Remove a finished step first.' };
      state.steps.push(...message.steps.map(text => ({ id: crypto.randomUUID(), text: text.trim(), done: false })));
    } else if (['edit', 'done', 'active', 'remove'].includes(message.action)) {
      const step = state.steps.find(s => s.id === message.id);
      if (!step) return { ok: false, error: 'This step has changed. Reopen My steps.' };
      if (message.action === 'edit') {
        if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 500) return { ok: false, error: 'Write a step of 1–500 characters.' };
        step.text = message.text.trim();
      }
      if (message.action === 'done') { step.done = !!message.done; if (step.done && state.activeId === step.id) state.activeId = null; }
      if (message.action === 'active') { state.activeId = step.id; step.done = false; }
      if (message.action === 'remove') { state.removed = { step, index: state.steps.indexOf(step) }; state.steps = state.steps.filter(s => s.id !== step.id); if (state.activeId === step.id) state.activeId = null; }
    } else if (message.action === 'undo') {
      if (state.removed && state.steps.length < 60) { state.steps.splice(state.removed.index, 0, state.removed.step); state.removed = null; }
    } else if (message.action === 'draft' || message.action === 'undo-draft') {
      if (message.revision !== state.draftRevision) return { ok: false, error: 'The saved draft changed in another tab. Your text is still here; reload the saved draft before replacing it.' };
      if (message.action === 'draft') {
        if (typeof message.text !== 'string' || message.text.length > 6000) return { ok: false, error: 'Keep the draft under 6,000 characters.' };
        state.previousDraft = state.draft; state.draft = message.text;
      } else if (state.previousDraft !== null) { const old = state.draft; state.draft = state.previousDraft; state.previousDraft = old; }
      state.draftRevision++;
    } else return { ok: false, error: 'Unknown plan action.' };
    await chrome.storage.local.set({ neoWorkState: state });
    return { ok: true, state };
  });
  workWrites = operation.catch(() => {});
  return operation;
};
