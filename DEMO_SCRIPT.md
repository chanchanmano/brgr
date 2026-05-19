# BRGR · Loom recording script (5 min)

Target: 5 minutes. Hard cap. Better to under-deliver and stay tight than
over-explain. Practice the voice flow 2-3 times before the real take —
Whisper is good but the FIRST utterance after a fresh start is often the
flakiest, so warm it up.

---

## Setup (do this BEFORE you hit record)

1. **Terminal 1**: `npm run backend` — wait for `Intelligent Bistro backend listening`
2. **Terminal 2**: `cd apps/mobile && npx expo start --clear` — wait for QR code
3. **Phone**: open Expo Go, scan QR, sign in (or already signed in)
4. **Phone state**:
   - Cart: empty
   - Orders: empty (clear via `curl -X DELETE http://localhost:3001/api/orders/<id>` if there's a stale one)
   - On Penny voice home, idle
5. **Screen recording**:
   - Mac screen recording (Cmd+Shift+5) with phone mirrored via QuickTime
   - OR Loom desktop with phone screenshare
   - Mic check — your voice + Penny's voice both audible
6. **Two browser tabs open** for the code segment:
   - Tab 1: GitHub repo (or local VS Code) on `apps/backend/src/services/penny.ts`
   - Tab 2: `PROJECT_LOG.md`
7. **One terminal pre-typed** with the fulfill curl command (you'll just need
   to fill in the order ID):
   ```
   curl -X POST http://localhost:3001/api/orders/__ID__/fulfill
   ```

---

## Beat 1 · Open + context (0:00 – 0:25)

**Show**: Penny voice home (Aryan, the chef-emoji avatar, the mic).

**Say** (verbatim, ~20s):

> "Hey, I'm Aryan. This is BRGR — my submission for Viridien's Intelligent
> Bistro challenge. It's a smash burger joint where you order by talking
> to Penny, an AI server. React Native Expo on the front, Node on the back.
> Let me show you around."

---

## Beat 2 · UI tour (0:25 – 1:15) — 50 seconds

Move fast. Don't explain every screen — let them speak for themselves.

1. **(5s) Penny home** — already on screen. Point at the avatar.
   > "This is the home. Voice is the primary interface."

2. **(10s) Top bar walkthrough** — tap each icon left to right:
   > "Conversation history, browse menu, orders, cart, profile."

3. **(15s) Menu screen** — tap menu icon.
   > "Menu's sectioned by category — burgers, sandwiches, sides, drinks.
   > Real photos, search at the top, tap any item to customize."
   - Scroll once to show the variety.

4. **(10s) Item detail** — tap on BBQ Bacon Burger.
   > "Per-item customization comes from the menu data — only items that
   > make sense get the toggles. The chicken sando has a heat slider; a
   > cola doesn't. One CTA: add to basket."
   - Don't actually add — back out.

5. **(5s) Cart** — back to menu, point at the cart icon FAB (top-right):
   > "Cart's empty right now. Let me actually order something — through
   > Penny."

   Tap Penny avatar to go back to voice home.

---

## Beat 3 · The AI conversation (1:15 – 3:30) — 2 min 15 sec

This is the meat. **Tap the mic**, then run through these turns. Speak
clearly and at normal pace — Whisper handles natural speech well.

### Turn 1 — order intent
**You say**: *"Can I get a BBQ bacon burger and a strawberry shake?"*

**Expected**: Penny adds nothing yet, asks about modifiers on the burger.
Something like *"One BBQ Bacon Burger and a Strawberry Shake. Any prep
notes on the burger — bacon, onion, pickles changes, or as-is?"*

**Callout to camera (5s)**:
> "Notice she didn't add anything yet — she's asking about modifiers
> first, like a real server would."

### Turn 2 — modifiers + off-menu test
**You say**: *"No pickles on the burger, and can I also get a side of pumpkin spice fries?"*

**Expected**: Penny adds the burger with `note: "no pickles"`, adds the
shake, and POLITELY declines the pumpkin spice fries because they're not
on the menu — should suggest Crinkle Fries or Loaded Tots.

**Callout (5s)**:
> "She caught the modifier as a note on the burger, AND declined the
> off-menu item without silently substituting — that was an explicit
> prompt rule."

### Turn 3 — accept the substitution
**You say**: *"Sure, crinkle fries works."*

**Expected**: Penny adds fries, asks if anything else.

### Turn 4 — explicit price check (only place she should say prices)
**You say**: *"How much is that going to be?"*

**Expected**: Penny gives the total. (She doesn't quote prices
otherwise — also a prompt rule.)

**Callout (3s)**:
> "Prices only come up when you ask — keeps the conversation clean."

### Turn 5 — close out
**You say**: *"That's all."*

**Expected**: Penny gives the readback summary with the total and asks
*"Should I place it?"* — a small confirmation card appears on screen.

### Turn 6 — confirm
**You say**: *"I confirm."*

**Expected**: Penny says *"On it!"* (or similar), app navigates to
tracking screen.

**On the tracking screen (5s)**:
> "Cart cleared, order placed, status polling the backend."

### Turn 7 — fulfill from CLI
Switch to your pre-typed terminal. Read the order ID off the tracking
screen (top bar: "ORDER #1234"), fill it in, hit enter:

```bash
curl -X POST http://localhost:3001/api/orders/1234/fulfill
```

**Callout (5s)**:
> "The kitchen marks it delivered from the CLI — backend has an
> in-memory order store with a fulfill endpoint. The mobile client polls
> every 3 seconds…"

Wait ~3 seconds. Tracking screen morphs to "Delivered — enjoy!" with a
"Start a new order" button.

> "...and the UI flips."

Tap "Start a new order" → archives to history, lands on Penny home.

### Turn 8 — show order history (5s)
Tap the orders icon in the top bar.

> "Past orders show up here, Uber-style. Queued at top, past below."

Back to home.

---

## Beat 4 · Code + tools (3:30 – 4:40) — 70 seconds

Switch to your editor / GitHub tab.

### (15s) Repo structure
Show the file tree.
> "Monorepo: `apps/mobile` is the React Native app, `apps/backend` is
> the Node/Express server. Clean separation, types shared by hand
> because it's a small project."

### (25s) The Penny prompt
Open `apps/backend/src/services/penny.ts`. Scroll to the
`CRITICAL PATTERNS` section.

> "The conversation logic lives in the Penny system prompt. There are
> seven critical patterns — close-out, modifier asks, off-menu refusal,
> price suppression, the works. Each pattern was a real failure I hit
> while building this and pinned down with an explicit rule."

Scroll to show the `ANTI-PATTERNS` section briefly.

> "Anti-patterns at the bottom so the model has both positive and
> negative examples."

### (15s) Intent + actions split
Open `apps/mobile/types/order.ts`. Show the `PennyIntent` type.

> "Every Penny response carries two things: `actions` for cart
> mutations, and `intent` for the conversation state — ordering,
> confirming, confirmed, cancelled. Separating those let me drive the
> UI from intent without hacking pseudo-actions."

### (15s) AI stack
Open `apps/backend/src/services/penny.ts` top, show model env var.
Then briefly mention the others.

> "Three AI services: Groq's Qwen 3 for the LLM, Whisper-large-v3 for
> speech-to-text, and Microsoft Edge's neural TTS for Penny's voice.
> Backend's mostly a thin orchestration layer."

### (10s) Tools used
> "Built almost entirely with Claude Code. Every directional call,
> failed attempt, and pivot is in `PROJECT_LOG.md` at the repo root.
> Open the GitHub link to see the full history of trying three TTS
> providers before landing on the one that worked."

(Optional: actually open `PROJECT_LOG.md` and scroll the "Direction
history" section for ~5 seconds.)

---

## Beat 5 · Wrap (4:40 – 5:00) — 20 seconds

Back to Penny home.

> "That's the demo. Repo link's below, project log explains every
> decision, end-to-end voice ordering with real LLM intent parsing and
> a working CLI hook for the kitchen side. Thanks for watching."

---

## Recovery moves (if something breaks)

| Failure | Recovery |
|---|---|
| Penny mishears the first command | Tap mic, say *"Let me start over."* — she'll reset. Or say it again clearly. |
| LLM returns something weird (rare with Qwen) | Read it back to camera, treat it as a feature: *"Sometimes the model surprises me — let me re-order."* Re-tap mic. |
| Backend times out on TTS | Try once more. If it happens again, skip TTS — say *"Audio's flaky right now, but the text reply is what matters — you can see her response in the transcript icon."* Tap transcript. |
| Order doesn't show in tracking after fulfill | Wait ~6 seconds for two poll cycles. If it still doesn't, swipe Expo Go away + reopen — order survives in AsyncStorage. |
| You're running long at 4:30 | Skip Beat 4's code-tour middle bullets; just say *"Code's on GitHub — Penny prompt is the interesting part."* |

---

## What to call out vs. what to just SHOW

**Call out** (with your voice, briefly):
- Waitress-style modifier asking
- Off-menu refusal (no silent substitution)
- Prices only on demand
- Intent/actions separation
- CLI fulfill hook
- PROJECT_LOG existence

**Just show** (don't narrate):
- Loading transitions
- Avatar animations
- The TTS playing (it's audible)
- Cart updates / FAB badge incrementing
- Section headers on the menu
- Image quality

---

## One-line elevator pitch (for the Loom title/description)

> "BRGR — voice-first restaurant ordering. Tap mic, talk to Penny, she
> handles the cart. Built with Claude Code, React Native, Groq, and Whisper."
