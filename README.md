# Neo · ADC Hackathon 2026

A Manifest V3 Chrome extension based on `neo-build-proposal.md`, extended with a cursor companion, browser-wide quick actions, and optional AI chat. Plain HTML, CSS, and JavaScript with no extension build step or account system. Local actions work offline; AI chat uses a separate local server.

## Run in Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select the `neo-extension` folder in this directory.
3. Pin Neo, then reload the extension after code changes. Refresh any website tabs that were already open so the companion content script is injected.
4. On a normal `http://` or `https://` website, press **Alt + Shift + N** or click Neo’s toolbar action → **Summon Neo**. The mascot appears near your cursor. Chrome blocks extensions from injecting into its own settings pages, Web Store, and built-in PDF viewer.

Reload the extension after changing code, then reopen its workspace. Opening `dashboard.html` directly is useful for layout previews, but the demo should run from the installed extension.

## Cursor companion

The website companion has both quick actions and chat. **Chat with Neo** in the toolbar opens chat directly on the current website; **Chat with Neo** in the demo workspace opens a full-size conversation:

- **Capture an area** lets you drag a region (or use arrows, Shift + arrows, and Enter), review its screenshot, name it, and save a checkpoint. **Saved** lists up to 12 local checkpoints. **Return** activates the matching tab or reopens its URL, then highlights the saved region; if the page has changed, the position may be approximate. Escape cancels capture.
- **Focus an area** lets you click a paragraph or field; Neo highlights it and dims the rest of the page. Escape or **Clear focus** restores the page.
- **Read my selection** formats text you selected in the page. It stays local.
- Chat understands local commands such as “capture an area”, “focus an area”, “read my selection”, “show my place”, and “snooze”. Capture, Saved, and Chat have separate views in the compact website panel.
- **Attach selection** is an explicit opt-in. Nothing from the page is attached to chat until you press it.
- **Quiet for 10 min** stops proactive nudges. **Follow my cursor**, **Offer help proactively**, and **Demo timing** are available in the toolbar popup.

Proactive nudges are based on observable events rather than inferred feelings: time away from a pinned task, a long continuous tab session, or a pause while typing in a non-password field. Each can be dismissed, and password fields are excluded.

## Optional AI chat

The extension works without AI. To enable open-ended chat, create a DeepSeek API key in your [DeepSeek account](https://platform.deepseek.com/api_keys). Copy `server/.env.example` to `server/.env`, set `DEEPSEEK_API_KEY` to that key, and set `NEO_EXTENSION_ID` to the ID shown at the bottom of Neo’s popup. Run `npm run start:ai`. In the popup, enable **AI chat**. Use **Chat with Neo** on a website or in the demo workspace. The local proxy calls `deepseek-flash` in non-thinking mode by default; the API key remains in the server and is never bundled into the extension. Messages are sent only when you press **Send**, and website text is sent only after you explicitly attach it. Workspace chat sends only text you type. Conversations disappear when the tab closes or reloads.

The proxy limits each reply to 450 tokens and each conversation request to 12,000 characters. It pauses AI chat once its estimated DeepSeek spending reaches $1. The estimate uses DeepSeek's peak `deepseek-flash` prices and token usage returned by the API; it reserves a conservative amount before each call. The running total is stored in the ignored `server/.chat-usage.json` file and survives server restarts. This limits Neo's own calls, not other uses of your DeepSeek account, and provider prices can change. Check your DeepSeek balance during the demo. After changing `.env` or updating the extension, restart the local server and reload Neo at `chrome://extensions`. Existing `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, or `GEMINI_MODEL` entries are ignored and can be removed from your private `.env` once you no longer need them.

## Rehearse the demo

1. **My focus / Minh:** click a report paragraph (or type a draft). Switch to a real second tab for at least **8 seconds**, then return. Neo highlights the exact place selected. Shorter absences do not trigger a nudge.
2. Click **Simulate: meeting approaching**. The meeting pill advances through 10, 5, and 1 minute, with **4 real seconds per stage**. **Join call** opens a clearly labeled local demo room. Return to the workspace with your text intact.
3. **My day / Lan:** click **Simulate calendar change**. The previous time is crossed out, the new time and attendee appear, and a separate card explains the change. Click repeatedly to demonstrate different state changes.
4. **One step at a time / Lan:** click or Tab through any onboarding field. Other fields, the banner, and the policy badge dim. Click outside a field to restore them. Use fictional information only.
5. **Restart demo** clears the draft, form, timers, selected paragraph, calendar changes, and Neo, and returns to My focus.

Timing constants are at the top of `neo-extension/dashboard.js` and `neo-extension/companion-config.js`. The calendar uses a deterministic local template and explicitly labels it as such; no real calendar, document, payroll, or video-call service is connected. The optional AI server is separate and only handles chat. The optional working-rhythm summary is not included.

## Design and accessibility

Proposal palette; bundled Manrope font with its open font license; keyboard focus indicators; semantic forms; reduced-motion support; polite status announcements; no diagnosis disclosure. No remote resources are needed at runtime. Intended for desktop Chrome at 1100px or wider.

## Verification

Use Node.js 22 or newer. Run `npm ci` then `npm test` for behavioral, package, and local HTTP server checks (development only; the extension itself needs no install). These cover drift thresholds, calendar changes, meeting stages, Spotlight, reset, cursor actions, settings races, snooze/resume, chat boundaries, and proxy failures. Proxy tests mock the AI provider; they do not use a real key or incur API charges.

The server listens only on `127.0.0.1:4318`. Settings and screenshots persist in local extension storage on this device until deleted. Each screenshot is reduced before saving; if space runs out, Neo asks you to delete a checkpoint and does not erase one automatically. Checkpoints save a URL, coordinates, and a structural locator, but not extracted page text or form values. Chat history and text selection disappear on reload, and screenshots are never sent to AI automatically. HTTP/HTTPS host access is needed for in-page capture; localhost access is for the optional AI proxy.

For a short browser-wide demo, enable **Demo timing**, summon Neo on a website, choose **Capture an area**, drag a region, review and save it, then switch to a different website tab for at least 9 seconds. Neo offers to return to the saved checkpoint. To show the form nudge, focus a non-password field and wait 12 seconds without typing. Quiet mode and the cooldown suppress repeated nudges; use **Resume nudges** or start a fresh tab for another rehearsal.

Automated verification covers the extension behavior in a simulated DOM. Actual unpacked Chrome loading, visual layout, and real cross-site injection still need the manual rehearsal above; no connected browser was available in this build session.
