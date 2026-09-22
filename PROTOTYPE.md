# Neo: understand, act, participate

Neo helps people understand workplace expectations, find a next step, and communicate what they need—on their own terms. Support preferences describe what helps, never a diagnosis. The same task can be approached with a concise checklist, an overview, or an example.

## Run the functional prototype

1. Use Node.js 22 or newer. Run `npm install` and `npm test`.
2. In Chrome, open `chrome://extensions`, enable Developer mode and Load unpacked → `neo-extension`. Reload an existing installation after changes, and refresh website tabs.
3. Open Neo's toolbar popup. Copy the Extension ID at the bottom.
4. Copy `server/.env.example` to `server/.env`. Set `OPENAI_API_KEY` and `NEO_EXTENSION_ID` locally. Never paste the key into chat or a website. Keep the example's model or use a compatible Responses/Structured Outputs model available to your account.
5. Run `npm run start:ai` in one terminal and `npm run start:workplace` in another. They listen only on loopback, ports 4318 and 4319 respectively.
6. Enable AI chat in the popup. Check connection. A configured server does not prove provider access; send a message to verify the key, billing, and model access.
7. Open `http://127.0.0.1:4319` in the same Chrome profile as the extension. Move the cursor: Neo follows nearby. Approach the mascot to click it; it stops following when you open it or focus it with the keyboard. Alt+Shift+N also opens it.

The workplace page is a fictional company portal served as an ordinary website. It uses the real installed extension, not an imitation or a scripted chat. Other normal HTTP/HTTPS pages use the same companion. Site compatibility still varies, especially embedded frames, canvas editors, and browser-protected pages.

## The story

You have joined a product team. Alex asks you to turn customer notes into an onboarding update before Thursday's review, and also mentions welcome-page copy without a clear priority. The message omits the review time and the expected update format.

1. Select the message with the page's button. Summon Neo → Attach selection → Understand this → Send. Neo should identify what was explicitly requested and what needs clarification, without inventing a deadline time or Alex's intentions.
2. Choose Make next steps and ask for a plan. Edit the suggested steps before adding them to My steps. Choose Do this next. You can add your own steps, edit, complete, remove and undo removal. They survive reloads.
3. Choose Draft a message: “Help me ask Alex which task takes priority and what format the update should use.” Review the result, open it in the draft editor, edit, save and copy. Nothing sends automatically. Draft replacement has an undo; concurrent saves from another tab produce a conflict message instead of silently overwriting.
4. Work on the notes below. Capture a screenshot checkpoint, name it, switch tabs and return through Saved. Screenshots stay on the device and are never attached to AI.
5. Change support preferences and try the same request again. Explain that individuals—not diagnostic categories—choose the support.
6. Invite a judge to replace the message with unfamiliar input. Responses should follow that input. Do not claim live AI if the server is unavailable.

## Real places to use Neo

- Onboarding portal: turn provided instructions into manageable steps.
- Browser messaging: clarify an ambiguous request and draft a question.
- Task board: organise supplied requirements and ask about competing priorities.
- Training page: request a short explanation, overview, or example.
- Document/form: focus an area, capture a checkpoint, and resume after interruption.

## Boundaries and recovery

- AI sends typed messages, up to four recent conversation messages, the text explicitly attached, and explanation preferences. Recent chat stays in page memory. Clear chat resets it. AI does not automatically read the page, saved plan, screenshots, fields, or other tabs.
- Review generated content. Neo does not know company policy, teammates' intentions, actual workload, or deadlines that were not provided. It does not diagnose or infer burnout.
- Steps, preferences, saved drafts and checkpoint screenshots are stored in extension-local storage. Unsaved editor changes remain only in the current page. Save draft before refreshing. Workplace notes save separately in localStorage with visible failure handling.
- AI failure retains your request and attachment for a manual retry. There are no canned answers masquerading as AI. Local focus, checkpoints and planning remain usable without AI.
- Focus an area works by pointer or arrow keys + Enter; Escape cancels. Follow my cursor can be disabled. Prompts stay visible until dismissed by default. Timing, explanation length, format and draft tone are adjustable.
- The earlier calendar dashboard remains accessible from the popup and is explicitly a simulation, not a connected calendar. Its reset now offers draft recovery.
- Live provider validation requires a configured API key and valid extension ID. Automated tests mock the provider and do not prove live response quality or accessibility with a screen reader.

API implementation reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Verification in this build

`npm test` covers simulated-DOM interactions, the local storage worker, HTTP proxy boundaries, structured response validation, and the workplace example. Provider calls are mocked. An optional `node tests/browser-smoke.cjs` runs the installed extension in headless Chromium using a temporary extension copy with an open shadow root for selectors; its provider is also mocked. Install Playwright separately or set `PLAYWRIGHT_MODULE` to its package path and install Chromium before running it. In the build environment, Chromium failed to launch with `spawn UNKNOWN`, so browser visual and live-provider verification remain pending. No API key was configured.
