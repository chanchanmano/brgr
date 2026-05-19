# BRGR · Intelligent Bistro

Voice-first restaurant ordering app for **BRGR**, a smash burger joint.
Customers talk to **Penny**, an AI server, who handles the cart through
natural conversation. Built as a take-home for Viridien's AI Full-Stack
Engineering Internship.

The whole loop runs end-to-end: tap mic → speech-to-text → LLM intent
parsing with conversation history + cart awareness → cart actions applied →
text-to-speech reply played back. Cart, orders, and conversation are all
persisted across app restarts. Order placement hits a real backend with a
CLI fulfillment hook so the "kitchen side" can mark an order delivered.

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo SDK 54, Expo Router, Zustand + AsyncStorage |
| Backend | Node 20 + Express, in-memory order store |
| LLM | Groq `meta-llama/llama-4-scout-17b-16e-instruct` (JSON-mode) |
| STT | Groq `whisper-large-v3-turbo` |
| TTS | Microsoft Edge Neural TTS via `msedge-tts` (free, no key) |
| Audio | `expo-audio` for both recording and playback |
| Built with | Claude Code — see [`PROJECT_LOG.md`](./PROJECT_LOG.md) |

The only paid dependency is Groq (free tier is fine for a demo); TTS is
unauthenticated, STT is included in Groq's free tier, and there's no
OpenAI key required.

## Prerequisites

- Node.js 20+
- npm 10+
- Expo Go on a physical Android/iOS device, *or* an Expo development build
- A Groq API key from [console.groq.com](https://console.groq.com)

## Setup

```bash
# 1. Install dependencies (single npm workspace)
npm install

# 2. Copy env templates
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env

# 3. Put your Groq API key in apps/backend/.env
#    GROQ_API_KEY=gsk_...

# 4. (Optional) If running Expo Go on a physical device on the same Wi-Fi
#    as your dev machine, set EXPO_PUBLIC_API_URL in apps/mobile/.env to
#    your machine's LAN IP. The default (10.0.2.2 on Android emulator,
#    localhost otherwise) covers most setups.
```

## Running

```bash
# Backend + Expo together
npm run dev

# Or independently
npm run backend       # → http://localhost:3001
npm run mobile        # → Expo dev server
```

Backend health check:

```bash
curl http://localhost:3001/health
# → { "status": "ok", "llm": "...", "stt": "...", "tts": "..." }
```

## Talking to Penny

Once the app loads on the Penny home screen:

1. Tap the mic
2. Order naturally — *"I'll have two BBQ bacon burgers, no pickles on one,
   and a lemonade"*
3. Penny asks the right follow-up questions (modifiers, sides, drinks)
4. When you're done, say *"that's all"* — she'll read back the full order
   with total
5. Say *"I confirm"* to actually place it (explicit gate — no accidental
   orders)
6. The tracking screen polls the backend; from your laptop:

   ```bash
   # Mark an order delivered (find the ID in the tracking screen header)
   curl -X POST http://localhost:3001/api/orders/<ORDER_ID>/fulfill
   ```

   The mobile client updates within ~3 seconds.

## Architecture highlights

- **Intent + actions separation.** Penny's response carries `actions[]`
  (cart mutations) and `intent` (conversation state: `ordering` →
  `confirming` → `confirmed` / `cancelled`). The UI is driven by intent so
  pseudo-actions never have to encode UI transitions.
- **Cart-aware LLM.** Every `/api/parse-order` call includes the current
  cart snapshot and the last 6 conversation turns. Penny reads the cart
  before mutating it, which avoids re-adding existing items on close-out.
- **Deterministic safety net for the duplicate-add bug.** Even strong
  models occasionally emit a bare `add` when the user says "no pickles" on
  an item already in the cart. The backend post-processes the LLM's
  actions and converts modifier-on-existing into `[remove, add]` so the
  quantity never doubles. See `dedupeModifierAdds` in
  [`apps/backend/src/services/penny.ts`](./apps/backend/src/services/penny.ts).
- **Voice cancellation via request-token guard.** Tap the mic during
  *Listening / Thinking* and the in-flight transcribe/LLM result is
  discarded rather than overwriting state. Never stuck.
- **Order lifecycle, Uber-style.** Cart clears on placement, the order
  moves into a `currentOrder` slot for tracking, then archives to
  `history[]` when the user starts a new one. The `/orders` screen lists
  queued + previous.

## Repo layout

```
apps/
  mobile/                      Expo app
    app/                       expo-router screens
      (tabs)/                  Penny home, menu, cart
      item/[id].tsx            customisation
      orders.tsx               history
      tracking.tsx             post-placement
      onboarding.tsx, auth.tsx
    components/                FAB, header buttons, primitives
    hooks/                     useBasicPenny, useVoiceRecording, useTextToSpeech, useOrderSync
    lib/api.ts                 backend client
    store/                     zustand stores (cart, session, auth, order)
    data/menu.ts               16-item menu with photos + customization
  backend/                     Express server
    src/
      routes/                  parse-order, transcribe, speak, orders
      services/                penny (LLM), transcribe (STT), speak (TTS)
      data/menu.ts             mirror of mobile menu
DEMO_SCRIPT.md                 5-minute Loom walkthrough script
PROJECT_LOG.md                 full build journey — every nudge, fix, and pivot
```

## Why these tools

- **Groq for inference.** Llama 4 Scout on Groq gives sub-second LLM
  responses for the typical Penny turn. After benchmarking several models,
  Scout was the only one that consistently followed the multi-rule prompt
  (modifier-asks, off-menu refusal, price suppression) at acceptable
  latency. See PROJECT_LOG for the full bake-off.
- **`msedge-tts` for voice.** Microsoft Edge's neural voices, free, no key,
  reverse-engineered endpoint via npm. Mobile streams the MP3 directly
  from `/api/speak` — zero disk writes, zero cleanup.
- **Claude Code for the build.** Most of the codebase was iterated through
  Claude Code, with directional nudges captured in PROJECT_LOG. Every
  failed model swap, prompt tweak, and UI pivot is in there.

## What's not in scope

- **No auth/payment integration.** Sign-in is a name + email demo (no
  password) persisted to AsyncStorage. Payment is mocked as a fixed Visa
  card. The assignment was about conversational ordering, not commerce.
- **Order tracking is in-memory on the backend** and resets on restart.
  History is preserved on the mobile client via AsyncStorage.
- **No Penny-driven upsells.** "Penny suggests Add Onion Rings" cards were
  deliberately removed mid-build — see PROJECT_LOG.

## Submission

- **Repo:** https://github.com/chanchanmano/brgr
- **Loom:** *(recorded per `DEMO_SCRIPT.md`)*
