Neo — Build Proposal
A 1-day build spec for an AI coding agent. Read this whole document before writing any code. It defines exactly what to build, for whom, and what "done" looks like for a hackathon demo tomorrow.

1. One-line pitch
   Neo is an AI anchor for neurodivergent employees. Instead of waiting for a hotkey like existing AI assistants (e.g. Heyclicky), Neo proactively notices time, attention, transitions, surprises, and energy — and steps in before the person has to ask for help.

2. Context
   Built for ADC Hackathon 2026 (RMIT), neurodivergence track. The competition brief covers the full neurodivergent employment journey: career prep, job search, interviews, onboarding, day-to-day work, and retention.
   Deadline: a complete, demo-ready build by end of day today. This is a hackathon prototype, not production software. Every decision in this document is made to protect that deadline.
   Target groups: ADHD and Autism.
   This must be a real Chrome browser extension (Manifest V3), not a webpage that only looks like one. That's a deliberate, non-negotiable choice for this build — see §5 for how that's kept achievable in one day.
3. Who this is for
   Two personas drive every feature decision. Use their names in code comments and demo copy — do not genericize them.

Minh — ADHD. Struggles with task-switching, loses time on tab drift, and gets swallowed by hyperfocus until a meeting is already starting.
Lan — Autism. Needs predictability. Sudden changes (a moved meeting, a new attendee) and cluttered screens cause anxiety and cognitive overload.
A manager, who is not the primary user but benefits indirectly: fewer missed deadlines, fewer "did you see my message?" follow-ups, no need to personally manage accommodations. 4. The problem (from the competition brief)
Two-sided, and Neo must answer both sides:

What employees face: they don't know how, when, or who to ask for support; they mask fatigue trying to "perform normally" all day; their struggles only surface after burnout, not before.

What employers worry about: no clear framework for accommodation requests; cost and risk feel hard to justify; a standardised process feels safer, even when it quietly excludes people.

The insight the whole pitch rests on: a hotkey (like Heyclicky) assumes the person already knows they need help. For many neurodivergent employees, noticing is the hardest part. Neo notices first.

5. What to build today: a real Manifest V3 Chrome extension
   Build a working, loadable Chrome extension with these pieces:

A popup (the toolbar icon) — small, just a launcher.
A bundled "workspace" tab (dashboard.html), opened from the popup via chrome.tabs.create. This is where the report mock, the calendar mock, and the onboarding form mock live — a controlled environment you fully own, so the demo is reliable on stage.
Real interaction driving every feature — real elapsed-time tracking, real click/focus events, real state changes. Nothing is a pre-baked animation clip.
Build this in two tiers. Tier A is the required, safe target. Tier B is a stretch — attempt it only once Tier A is solid and rehearsed.

Tier A — required, low-risk, still genuinely "an extension"
The Drift Catcher's timing runs entirely on the dashboard tab itself, using the standard Page Visibility API (document.visibilitychange, document.hasFocus()). The presenter opens Neo's dashboard tab, then switches to any real second tab (any actual website) for a few seconds, then switches back. The dashboard tab genuinely detects that it lost and regained visibility — this needs no chrome.tabs permission, no background service worker, and no chrome.alarms. It is 100% reliable and still counts as "a real extension" because the whole thing is packaged and loaded as one, running as a real browser tab with a real chrome-extension:// URL.

Tier B — stretch, higher payoff, higher risk
A lightweight content script (content.js, matches: ["<all_urls>"]) injects a small, unobtrusive floating Neo badge onto every real page the presenter visits — visible proof to judges that the extension is genuinely present across the browser, not just on one tab. If there's time, extend this so the Neo nudge bubble can appear directly on the distraction tab itself (not just back on the dashboard), using a background service worker with chrome.tabs.onActivated to know which tab is currently active, and chrome.runtime.sendMessage to tell that tab's content script to show the bubble.

Known gotcha, read this before using chrome.alarms: Chrome enforces a hard minimum period on chrome.alarms (effectively ~1 minute) — it cannot fire every 8–10 seconds. Do not use chrome.alarms for the drift threshold. If Tier B needs a short delay in the background service worker, a plain setTimeout is acceptable for a demo this short (under ~10 minutes total), but service workers can be suspended by Chrome, so test it live, repeatedly, before presenting — this is the one part of Manifest V3 most likely to misbehave. If it's flaky, cut Tier B and present Tier A only; Tier A alone is a complete, working demo.

Explicitly out of scope (do not build these)
Chrome Web Store publishing or review — build for "Load unpacked" (Developer Mode) only.
Any browser other than Chrome (no Firefox, no Safari, no Edge testing).
Real calendar/email OAuth integration (Google Calendar API, etc.) — the calendar screen stays simulated, inside the dashboard tab.
User accounts, login, or a database — chrome.storage.local only, if anything needs to persist.
A backend server, unless it's a single lightweight proxy needed to call an LLM API without exposing a key client-side (see §7.3.1) — keep this minimal, or skip it and hardcode fallback text if it eats too much time.
Mobile responsiveness.
Fuzzy/ML classification of "this is a distraction site" — don't build a classifier. The presenter just switches to any real tab; that's the whole trigger. 6. Design principles (judged against a "Universal Design Checklist" at this hackathon — follow these deliberately)
Equitable Use — nothing in the UI requires disclosing a diagnosis to use it.
Flexibility in Use — more than one way to receive information (visual + short text, never walls of text).
Simple and Intuitive Use — no onboarding tutorial needed to understand what's happening.
Perceptible Information — clear, short, literal language. No idioms, no sarcasm, no vague timing words ("soon", "ASAP").
Tolerance for Error — nothing punishes the user. No "you failed" states, no lost progress, no shaming language, ever. A "Restart demo" control must always be visible on the dashboard tab.
Low (Cognitive) Effort — one idea on screen at a time. Never more than a few short lines in any message from Neo. 7. Feature specs
Build these in this order. Each is demoable on its own — if time runs short, stop after whichever feature you just finished and it should still look complete.

7.1 Drift Catcher + Hyperfocus Exit Ramp (ADHD — Minh)
Screen: the dashboard tab shows a mock "Q3 Report.docx" (a handful of gray placeholder text lines) styled to look like a real document editor.

Real logic required (Tier A):

On load, start listening for document.visibilitychange. When the tab becomes hidden (presenter switched to a real second tab), record a timestamp.
Demo-compressed threshold: in real life this would be ~10 minutes; for the demo, use 8–10 real seconds, held in a named constant (DRIFT_THRESHOLD_MS) with a comment noting the real-world value, so it's trivially tunable during rehearsal.
When the tab becomes visible again, compare elapsed time to the threshold. If it's crossed, Neo (see §8) appears with a short, non-judgmental line — e.g. "Still on the report? I can hold your place." — and a ring highlights the exact line in the doc mock the user "left off" on, with a follow-up like "Here's exactly where you stopped." No guilt language, ever (principle #5).
Hyperfocus ramp: a pill on the dashboard shows "Next meeting in —". Give the presenter a clearly-labeled control (e.g. a "Simulate: meeting approaching" button, visually separate from the main flow — it's a presenter tool, not something Minh would see) that starts a real countdown using setInterval, passing through at least two stages (e.g. "10 min" → "5 min" → "1 min", compressed to a few real seconds apart). On the final stage, a "Join call" button appears and visibly pulses or gets a ring, with Neo saying something like "1 minute — heading there now."
Tier B addition (stretch): show the same nudge bubble on the real second tab itself (via the content script), not just when the user returns to the dashboard — see §5's Tier B description and its gotcha warning before attempting this.

7.2 No-Surprise Mode (Autism — Lan)
Screen: the dashboard tab's calendar view — a mock day/calendar layout with one meeting card ("Sprint Review", a time, two attendee avatars).

Real logic required:

A presenter-facing control (a clearly-labeled button, e.g. "Simulate calendar change") triggers a real state change: the meeting's time visibly updates (old time gets a strikethrough, new time appears), and a new attendee avatar animates in.
This must be a genuine state mutation driven by a click, not a pre-baked animation clip — the button should work if clicked twice with different fake data, not just play once.
Immediately after, Neo shows a small panel (not a chat bubble — a distinct card, since this is a longer explanation) with exactly three short lines:
What changed
What it means for the person
What to do (often: nothing)
See §7.3.1 for making this text genuinely AI-generated instead of hardcoded.
7.3 Spotlight (Autism — works for ADHD too)
Screen: the dashboard tab's "New Hire Onboarding" form: one banner ("Complete before Friday!"), one small badge/notification ("3 new policies"), and 4–5 form fields with labels (Employee ID, Full name, Start date, Bank details, Emergency contact).

Real logic required:

When the user (or presenter) clicks/focuses into any one field, all other fields, the banner, and the badge should visibly dim (opacity transition), leaving only the focused field at full brightness with a ring or outline.
This must work for any field the presenter clicks, live, in front of judges — not just one scripted field. Use a real focus/click event listener, not a timeline step.
Clicking outside all fields returns everything to full brightness.
7.3.1 Optional but recommended: one real AI call
Pick one of the text-generation moments above (the No-Surprise three-line explanation is the best candidate) and wire it to a real LLM API call instead of hardcoded text, so at least one part of the demo is verifiably AI-generated live.

Send the structured change (old time, new time, attendees added) as input; ask for exactly three short lines in the "what changed / what it means / what to do" format; keep the system prompt strict about literal, non-idiomatic language (ties to principle #4).
Never expose an API key in client-side code — this matters even more in an extension, since a packed extension's JS is easy to inspect. Route the call through a tiny backend proxy (single-file Node/Express or Python/Flask endpoint). If that's more than ~20 minutes of setup, skip this and use 3–4 pre-written template variants chosen at random instead — that's a legitimate and honest fallback, and far better than a broken live demo.
Whatever you choose, the UI must degrade gracefully if the network/API call fails or is slow: show a short "thinking" state for at most ~1.5 seconds, then fall back to a template line. A live demo must never visibly hang or error out. 8. The Neo character (shared across all three features)
A single small on-screen presence, reused everywhere:

A simple circular mascot (a plain circle face is enough — two dot eyes, a simple curved mouth; no elaborate illustration needed) that moves smoothly to sit near whatever it's pointing at (CSS transition on left/top, not a redraw).
A ring/highlight (an SVG ellipse outline that "draws itself" briefly on appearance) that circles the specific element Neo is drawing attention to.
A speech bubble for short one-liners (Drift Catcher, hyperfocus nudges).
A separate note panel (a small card, not a speech bubble) for the three-line No-Surprise explanation — visually distinct because it carries more text.
Neo's default resting state is quiet/low-opacity in a corner — it should not look like it's constantly hovering or nagging. 9. Visual design tokens
Reuse exactly, for consistency with the deck and demo already made for this pitch:

Token Hex Use
Ink (primary text/dark bg) #1B211D
Canvas (light bg) #F6F4EF
Line/border #E4E0D6
Muted text #6E6A61
ADHD accent (bright, dark bg) #F0AE4E
ADHD accent (deep, light bg text) #8A5313
Autism accent (bright, dark bg) #6FC7B0
Autism accent (deep, light bg text) #2C6E5C
Typeface: Manrope (Google Fonts), one family, weights 400–800, used throughout. No second typeface needed.

General style: calm, low-clutter, generous spacing, rounded corners on cards (8–20px), no heavy drop shadows, no more than one accent color active on screen at a time (amber for ADHD moments, teal for Autism moments — never mix within one feature).

10. Tech stack and extension structure
    Manifest V3. Suggested file layout:

neo-extension/
manifest.json
popup.html
popup.js
dashboard.html <- the workspace: report mock, calendar mock, onboarding form
dashboard.js
dashboard.css
neo.js <- shared Neo character logic (mascot/ring/bubble/note panel)
content.js <- Tier B only: floating badge injected on real pages
icons/ <- a placeholder icon is fine; not a priority
Plain HTML/CSS/JS is enough — no build step, no bundler. This matters at demo time: the presenter should be able to load the unpacked folder and have it working in under a minute, with zero "npm run build" in between.
manifest.json essentials for Tier A only:
"manifest_version": 3
"action": { "default_popup": "popup.html" }
"permissions": ["storage"] (only if something needs to persist — otherwise this can be empty)
No "tabs", "scripting", "alarms", or "host_permissions" are needed for Tier A at all.
If Tier B is attempted, add: "permissions": ["tabs", "scripting"], "host_permissions": ["<all_urls>"], a "background": { "service_worker": "background.js" } entry, and a "content_scripts" entry matching <all_urls>.
If §7.3.1's live AI call is attempted, use whatever lightweight server framework you're fastest with, purely to hide the API key — nothing more elaborate.
Testing: chrome://extensions → enable Developer Mode → "Load unpacked" → select the folder. Reload the extension after every code change. Keep Chrome DevTools open on both the popup and the dashboard tab while building (right-click → Inspect) to catch errors immediately — Manifest V3 errors are often silent otherwise. 11. Non-functional requirements
Loadable via "Load unpacked" only. Do not spend any time on Web Store packaging, review requirements, or a production-signed build.
Chrome only. Do not test or account for Firefox/Safari differences.
A visible "Restart demo" control at all times on the dashboard tab. If anything breaks mid-demo, the presenter needs to reset instantly.
Never let the app depend on network access to function at a basic level. If the AI call in §7.3.1 fails or there's no wifi at the venue, the rest of the extension must still work perfectly with template text.
Keyboard-operable at least for the Spotlight feature (a judge may want to click through the fields themselves).
No console errors in either the popup, the dashboard tab, or (if built) the background service worker / content script. No dead buttons — if a control is visible, it must do something. 12. The live demo script (build the extension so this flow is smooth)
Presenter clicks the Neo icon in the Chrome toolbar → popup → "Open Neo workspace" → dashboard tab opens: Minh is "writing his Q3 report."
Presenter switches to a real second tab (any actual website) for a few seconds, then switches back to the dashboard tab. Neo gently offers to hold the place; a ring shows exactly where Minh left off.
Presenter triggers the meeting-approaching state. Countdown plays through its stages; the "Join call" button lights up.
Presenter switches context on the dashboard: "Now here's Lan." Clicks "Simulate calendar change." The meeting card updates live. Neo's three-line explanation appears (ideally the real AI-generated one).
Presenter opens the onboarding form section and clicks through a couple of fields live, showing Spotlight react to each one in real time — this is the moment to invite a judge to try it themselves if there's time.
(If Tier B is working) Presenter switches to a real page and shows the small Neo badge sitting quietly in the corner, proving the extension is genuinely present across the browser.
Close on: "A hotkey assumes you know you need help. Neo notices first." 13. Definition of done
The extension loads cleanly via "Load unpacked" with no console errors.
Tier A works completely: switching to a real second tab and back genuinely triggers the Drift Catcher, driven by real Page Visibility events — not a hardcoded autoplay sequence.
The No-Surprise and Spotlight features both work live, driven by real clicks/focus events.
The demo script in §12 (steps 1–5 at minimum; step 6 only if Tier B is done) can be run start to finish without touching DevTools.
A "Restart demo" control exists on the dashboard tab and actually resets all state.
The extension still functions with no network connection (aside from the optional §7.3.1 call, which degrades gracefully).
No feature requires explaining "imagine this were real" — everything on screen should look and behave like a real product screen, even though the data behind it is fake. 14. If extra time remains (stretch, do not start until §5–§13 are solid and rehearsed)
Tier B in full (§5), if not already attempted.
A "My Working Rhythm" summary card on the dashboard (a few label/value rows — "Best with: written instructions", "Needs: +30% deadline buffer" — plus a "Share with manager" toggle that's off by default) built from a small hardcoded/seeded history, persisted in chrome.storage.local so it survives closing and reopening the tab.
A comparison moment in the UI (even just a one-screen toggle) contrasting "waits for a hotkey" vs "notices first," reinforcing the core pitch line.
