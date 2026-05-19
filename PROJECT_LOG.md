# BRGR · Project Log

Running log of decisions, issues, and fixes during the build. Newest first.

---

## 2026-05-18 — Penny prompt: stricter off-menu + no conversational prices

Two failure modes the prompt was vulnerable to, both now blocked by
explicit `CRITICAL PATTERNS` entries.

### Off-menu requests (PATTERN F)

Previously Penny would sometimes silently substitute a menu item when the
customer asked for something we don't sell ("can i get a hot dog" → adds a
Classic Smash). That's both confusing and a real liability — you'd be
charged for something you didn't order.

New behaviour:
- If the request doesn't match a menu entry by name, category, or a
  well-established nickname → `actions: [{"type":"none"}]`
- Reply CLEARLY states BRGR doesn't have it, optionally points at what we
  do have ("we're burgers, sandwiches, sides, drinks — want a suggestion?")
- "Reasonable nickname" is enumerated: `coke`/`soda` → cola, `milkshake` →
  shake, `veggie burger` → garden. If Penny is unsure, she asks instead of
  guessing.

Verified: \`"can i get a hot dog"\` → "Sorry, we don't have hot dogs at
BRGR — we're burgers, sandwiches, sides, and drinks. Want me to suggest
something from our menu?" Zero actions.

### No prices in conversation (PATTERN G)

Penny was reading prices into every line addition ("One BBQ Bacon Burger,
that's $11.50. Anything else?"). Users can see prices in the app — saying
them out loud is noisy, especially over TTS, and inflates reply length.

New rule: prices appear in Penny's voice ONLY when
- (a) The user explicitly asks ("how much is X?", "what do I owe?")
- (b) The cart readback for confirmation, which gives the TOTAL, not
  per-item prices

Verified:
- \`"a bbq bacon burger"\` → "One BBQ Bacon Burger. Any prep notes…" — no
  price
- \`"how much is the double stack"\` → "The Double Stack is $13. Want to
  add it?" — price given because explicitly asked

---

## 2026-05-18 — Menu expansion + sectioned browse layout

Bumped the menu from 8 → 16 items and grouped the menu screen by category.

### New items

- **Burgers (5 total):** Classic Smash, Double Stack, BBQ Bacon Burger,
  Mushroom Swiss, The Garden Smash
- **Sandwiches (2):** Spicy Chicken Sando, Crispy Fish Roll
- **Sides (4):** Crinkle Fries, Onion Rings, Loaded Tots, House Slaw
- **Drinks (5):** Strawberry Shake, Cherry Cola, Chocolate Malt, Lemonade,
  Iced Coffee

Each new item has a full `customization` block (included, holdable, extras,
prompt) so:
- The item detail page automatically renders the right "Hold any of these?"
  toggles
- Penny knows what each one comes with and what modifiers are valid

### Five places needed sync

This was the biggest gotcha. Adding a menu item touches:

1. \`apps/mobile/data/menu.ts\` — primary source for the mobile UI
2. \`apps/backend/src/data/menu.ts\` — what Penny sees in her system prompt
3. \`components/BistroPrimitives.tsx\` — \`ITEM_TINTS\` for the fallback tile color
4. \`lib/mockPenny.ts\` — \`aliases\` (regex matching for the local fallback
   parser) + \`pluralItemNames\`
5. Image URLs for FoodTile/FoodHero (Unsplash)

If any of these are out of sync, you get fun bugs:
- Forget backend sync → Penny insists the item doesn't exist
- Forget aliases → fallback parser ignores it when the LLM is unreachable
- Forget plurals → "2 BBQ Bacon Burgers" reads as "2 BBQ Bacon Burger"
- Forget image → tile falls back to abstract pattern (graceful but flat)

### Browse menu now sections by category

Previously the menu screen showed all items in one undifferentiated list
under a single "Menu" header. With 16 items that becomes a wall.

Now:
- When category filter is \`All\` → renders four discrete sections in fixed
  order (Burgers → Sandwiches → Sides → Drinks), each with its own
  \`SectionHeader\`
- When category filter is anything else → just that one section with the
  category name as header

The "Today's pick" featured strip stays at the top regardless.

### Verified end-to-end

\`POST /api/parse-order\` with \`"a bbq bacon burger and a lemonade"\` returns
a clean Penny response that picks the right items and asks the right
customization questions. No fallback to "I don't have that on the menu."

---

## 2026-05-18 — Aesthetic / consistency audit

Sweep-up pass after the Uber-style order lifecycle work. Three real issues
found and fixed.

### Item detail was showing "Heat" and "Pickles" for everything

The customization section had hardcoded `OptionGroup label="Heat"` and
`ToggleRow label="Pickles"` — so Cherry Cola and Crinkle Fries were being
asked about heat level and pickle preference. Visually weird, functionally
wrong.

Now driven by `item.customization`:
- **Heat slider** only renders for `item.id === "spicy"` (the only menu
  entry where heat is actually a concept)
- **Hold toggles** render one per entry in `item.customization.holdable`.
  E.g., Classic Smash gets toggles for American cheese, secret sauce,
  pickles, onion. Fries gets a "salt" toggle. Cola gets ice + cherry syrup.
- If an item has no customization data (none in the current menu, but
  defensively), the whole section is hidden.

`buildNote()` now constructs notes from whatever the user toggled off:
`"no pickles, no onion · hot heat"`. Sent down as the cart line `note`.

### Item detail had 140px of dead bottom padding

After the Penny picks card was removed, the `ScrollView` still reserved
`paddingBottom: 140` to clear it. The sticky "Add 1 to basket" banner is
only ~80px tall — 140 left a visible gap. Reduced to 110 (banner clearance
+ a little breathing room).

### Cart had a phantom empty line where the upsell card used to be

Two consecutive blank lines in the JSX between the line items and the tip
section. Not a render bug (JSX whitespace is ignored), just dead source.
Cleaned up.

### Things checked but left alone

- **Voice home top bar density** (5 buttons + wordmark): 38px buttons with
  8px gaps = 222px on the right cluster. On a 400px+ screen the wordmark
  still has ~180px on the left. Not cramped — left as is.
- **Cart empty state**: considered adding a "View past orders" link, but
  the cart only empties after placement, at which point the user is on
  /tracking anyway. Low-value addition.

---

## 2026-05-18 — Uber-style order lifecycle + orders screen

Aligned the post-placement flow with what users expect from food-delivery
apps. Four behavioral changes plus a new screen.

### Cart now clears on placement

Previously, placing an order kept the cart populated. Returning to the cart
showed the just-ordered items as if they were still pending. Now, both the
voice flow (`(tabs)/index.tsx`) and the manual flow (`(tabs)/cart.tsx`) call
`useCartStore.getState().clear()` immediately after a successful `placeOrder`.
Items have semantically "moved" into the placed order — the cart is for items
not yet ordered.

### Orders go to history instead of vanishing

`useOrderStore` now keeps two slots:

- **`currentOrder`** — the single active order being tracked
- **`history: PlacedOrder[]`** — past orders, capped at 20, persisted

Two new actions:
- **`archiveCurrentOrder()`** — moves the current order (whatever its status)
  into history and frees the active slot. Called when the user taps "Start a
  new order" on tracking.
- **`clearOrder()`** — wipes the active slot WITHOUT archiving. Called only
  when backend forgets the order (404) — there's nothing meaningful to remember.

Previously, "Start a new order" called `clearOrder()`, which erased the
fulfilled order entirely. Now it archives, so users can scroll back.

### New `/orders` screen

A dedicated read-only list of all orders. Two sections:

- **QUEUED** — the active order (if any), with a tomato accent border and tap
  to jump into `/tracking`
- **PREVIOUS** — past orders rendered as cards with order id, line items
  summary, date/time, total, and a colored status pill

Empty state: "No orders yet — Talk to Penny or browse the menu."

Status pill colors:
- `placed` → tomato tint ("In the kitchen")
- `fulfilled` → mint tint ("Delivered")
- `cancelled` → grey tint

### New top-bar entry point

Added `OrdersIcon` (receipt with text lines) to the voice home top bar,
between menu and cart. Discoverability for the new screen.

### Removed all Penny upsell surfaces

Per the "consider that later" call:
- Cart screen: deleted the dark "Penny suggests · Add Onion Rings? $5"
  upsell card + all its styles + the now-unused `add` selector
- Item detail: deleted the "Penny picks · These would slap with that" pair
  suggestion card, the `PairChip` helper component, the `sideSuggestion` and
  `drinkSuggestion` useMemos, and all related styles

This was deliberate scope-shedding rather than design intent — upsell logic
is its own product surface and should be opt-in / contextual, not baked into
every browse screen. Easy to add back when there's a clear policy for *when*
Penny should suggest.

---

## 2026-05-18 — Direction history (the nudges that shaped the app)

Chronological list of the calls I made during the build — including the wrong
turns I had to reverse. Useful for narrating the demo video: every direction
here is a real "I tried X, hit a wall, pivoted to Y" moment.

### Initial direction (from the design handoff)
1. The chat tool gave me a high-fidelity HTML/JS prototype with a voice-first
   home screen, a menu browse mode, an item detail page, cart, and tracking.
   I started by faithfully porting that to React Native + Expo SDK 54.

### Voice-first pivot
2. **Voice as the home screen, not menu.** The early prototype dumped users
   into a menu list. I flipped it: voice is the front door, menu is the
   secondary "or browse" link. The premise being graded is the AI ordering
   experience — the UI should put it first.
3. **Waitress-style turn-taking.** Penny shouldn't blindly add what you say —
   she should ask back ("any preferences? pickles, cheese?") and split items
   when you specify modifiers ("no pickles on one of two").
4. **Multi-turn clarification was hard.** First the LLM hallucinated quantities
   (added 2 for "a chicken sandwich") and re-added cart items on close-out.
   Fixed by: upgrading model (Llama 8B → Llama 70B → Qwen 3 32B), enabling
   JSON response mode, and rewriting the prompt with explicit CRITICAL PATTERNS
   sections instead of softer rules.

### Speech in / speech out
5. **STT first.** Wired Whisper (via Groq) for speech-to-text. The mic button
   records audio, ships the file to `/api/transcribe`, gets back text.
6. **Silence detection.** Manual tap-to-stop felt clunky. Added VAD using
   expo-audio's metering — the recording auto-stops after ~1.2s of silence
   below −40 dB.
7. **Conversation loop.** After Penny replies, mic auto-restarts so the user
   doesn't have to tap again. Long-press mic ends the loop.
8. **TTS — three failed attempts before landing on one that works:**
   - **expo-speech (Samsung's on-device TTS):** robotic voice + 2 second
     warm-up where the green "speaking" ring would appear before any audio
     came out. State desync, glitchy. Abandoned.
   - **Groq PlayAI:** model was decommissioned by Groq mid-build. 400 errors.
   - **StreamElements public API:** added auth requirement mid-build. 401s.
   - **msedge-tts:** reverse-engineered Microsoft Edge's neural voice
     endpoint. Free, no API key, neural quality. Shipped this.
9. **Streaming, not downloading.** First version downloaded the MP3 to disk
   then played it (left files piling up in the cache). Refactored to stream
   directly from `${BASE}/api/speak?text=...` into the audio player — no disk
   writes, no cleanup.

### Conversation architecture
10. **Intent vs. actions.** The LLM response carries `actions` (cart mutations)
    AND `intent` (conversation state: `ordering` / `confirming` / `confirmed` /
    `cancelled`). Keeping them separate avoided special-casing fake "actions"
    just to drive UI transitions.
11. **Two-step confirmation.** First version placed orders as soon as user
    said "that's all". Too risky — one transcription error and you're paying
    for someone else's lunch. Now Penny summarizes, asks "should I place it?",
    and the user has to explicitly say "I confirm" before navigation. The
    phrase is intentionally distinctive so the LLM doesn't confuse it with
    other yeses.
12. **Cancel resets to state zero.** Cancel clears the cart, dismisses the
    summary card, ends the listening loop.

### UI iterations (the ones that felt wrong)
13. **Penny FAB chat-head:** first attempt was a circular floating button at
    the bottom-right of every browse screen, using the PennyAvatar (gradient
    disc + chef emoji). Looked like a "banner" stuck to the bottom — visually
    cluttered. Replaced with `PennyHeaderButton` in the top-right of every
    browse screen instead. Same affordance, cleaner placement.
14. **Decorative blobs hidden on browse screens.** The `BistroBackground`
    component renders 4 colored circular "blobs" as decoration. They look
    great behind the Penny voice home but were overlapping menu items on the
    browse screens. Conditioned to only render in non-flat mode.
15. **Hamburger menu icon was actually a text-align icon.** Original SVG had
    3 horizontal lines with the last one shorter (width 10 vs 16). Looked
    like the "text align left" icon. Fixed to 3 equal lines.
16. **TranscriptIcon was also too text-ish.** Speech bubble with two lines of
    different lengths inside. Replaced with bubble + 3 centered dots.
17. **Browse menu had no cart entry point.** After removing the PennyDock,
    there was no way to view the cart from the menu screen. Added `BasketBar`
    — a floating bottom banner showing item count + total. Hidden when cart
    is empty.
18. **Item detail had two conflicting CTAs.** A `− 1 +` quantity stepper AND
    a separate "Add to cart" button — unclear which was the primary action.
    Resolved into a single full-width "Add 1 to basket — $9.50" button.
    For quantities > 1, users use the stepper in the menu list after
    returning.
19. **Item-detail navigation goes back to menu, not cart.** Originally
    "Add to cart" routed to the cart screen, which interrupted browsing.
    Now `router.replace("/(tabs)/menu")` so the user can keep adding things.
    The basket bar shows the running total at the bottom.

### Backend / data lifecycle
20. **Placed orders persisted client-side AND backend-side.** Mobile keeps
    the order in zustand+AsyncStorage so it survives app restarts. Backend
    holds it in an in-memory Map so an operator can fulfill it via curl.
21. **Polling, not websockets.** Tracking screen polls `GET /api/orders/:id`
    every 3 seconds. If the backend returns 404 (forgot the order — e.g.
    restarted), the local store clears so the user isn't stuck.
22. **CLI fulfill endpoint.** `POST /api/orders/:id/fulfill` lets me mark
    orders delivered from terminal. Mobile picks up the new status within
    3 seconds and morphs the tracking screen into a "Delivered — enjoy!"
    state with a "Start a new order" CTA.

### Foundational fixes (the painful ones)
23. **Expo SDK 55 → 54 downgrade.** Play Store's Expo Go didn't yet support
    SDK 55. Downgraded. Then hit the duplicate-React problem
    (see 2026-05-16 entry below).
24. **Duplicate React + RN in monorepo.** After downgrade, two versions of
    both `react` and `react-native` got installed. Fixed via root `overrides`
    in `package.json` + a clean reinstall. Documented separately below.
25. **Dish images.** Added Unsplash URLs to each menu item. `FoodTile` /
    `FoodHero` render the network image overlaid on the abstract pattern
    fallback — if the image 404s, the pattern stays visible. No empty boxes.

---

## 2026-05-18 — Order lifecycle: backend orders service + CLI fulfillment

### What

Placed orders now exist in two places:

1. **Mobile**: persisted in `useOrderStore` (zustand + AsyncStorage). Survives app restarts.
2. **Backend**: held in an in-memory `Map<orderId, PlacedOrder>` (`apps/backend/src/services/orders.ts`). Lost on backend restart, which is desirable for a demo.

When the user confirms an order:
- `placeOrder()` creates the local order record (status: `"placed"`)
- Fire-and-forget `createOrder()` POSTs it to the backend
- Router pushes to `/tracking`
- `useOrderSync` hook on the tracking screen polls `GET /api/orders/:id` every 3s
- When the backend reports `status === "fulfilled"`, the local store flips and the tracking screen renders the delivered state with a "Start a new order" CTA

### Why backend at all?

The whole point: an operator (or test script) needs to be able to "complete" an order from outside the app. The `POST /api/orders/:id/fulfill` endpoint exists exactly for that:

```bash
# Find the active order
curl http://localhost:3001/api/orders | jq '.orders[].id'

# Fulfill it (the kitchen says "delivered")
curl -X POST http://localhost:3001/api/orders/1234/fulfill

# Or nuke it entirely (rare — for testing)
curl -X DELETE http://localhost:3001/api/orders/1234
```

Within 3 seconds the mobile client picks up the new status via polling and reflects it.

### Endpoints

| Method | Path                         | Use                                    |
|--------|------------------------------|----------------------------------------|
| POST   | `/api/orders`                | client-side, on confirm                |
| GET    | `/api/orders`                | debug / CLI list all                   |
| GET    | `/api/orders/:id`            | mobile polling                         |
| POST   | `/api/orders/:id/fulfill`    | **CLI: mark delivered**                |
| DELETE | `/api/orders/:id`            | CLI: wipe order from backend           |

### Tradeoffs

- **In-memory store** = lost on backend restart. The mobile client treats a `404` from `GET /api/orders/:id` as "this order is gone" and clears the local persisted order, so the UI doesn't get stuck on a tracking screen for an order the backend has forgotten about.
- **3s polling** instead of websockets/SSE — simpler, fine for a demo, no need to manage connection state.
- **No auth on the orders endpoints** — anyone on the network can place/fulfill orders. Fine for a demo, would need auth in production.

---

## 2026-05-17 — Penny conversation architecture: intent vs. actions

### Why two separate concepts?

`PennyResponse` carries both `actions: OrderAction[]` and `intent?: PennyIntent`. They look similar but they serve different layers:

- **`actions`** = changes to the **cart** state. `{type: "add", itemId, qty, note?}`, `{type: "remove", ...}`, etc. The cart store applies these mechanically.
- **`intent`** = the current **conversation** state. Drives **UI** behavior (which card to show, where to route, etc.), not cart behavior.

```ts
type PennyIntent = "ordering" | "confirming" | "confirmed" | "cancelled";
```

Mixing them would have created bugs like:
- An `add` action with `intent: "confirming"` that we'd have to special-case
- A pseudo-action `{type: "show_confirmation"}` that the cart store has to ignore
- No clean way to signal "navigate to tracking" without inventing a new "action" that isn't a cart change

Separating them lets each layer do its job:
- `cartStore.applyActions(response.actions)` — deterministic cart mutation
- voice home reads `response.intent` to decide whether to show the confirmation card, navigate, or reset

### The four intents

| Intent        | What it means                                  | UI side effect                          |
|---------------|------------------------------------------------|------------------------------------------|
| `ordering`    | normal back-and-forth                          | mic loop continues                       |
| `confirming`  | Penny just summarized + asked to confirm       | show summary card; await user response   |
| `confirmed`   | user said "yes I confirm"                      | place order, navigate to `/tracking`     |
| `cancelled`   | user said "cancel"                             | clear cart, dismiss card, back to idle   |

### The two-step confirmation

A naive "say done → place order" flow puts you one transcription error away from an unwanted order. The two-step is:

1. User: *"that's all"*
2. Penny → `intent: "confirming"`, reply: *"So that's 2 spicy chicken sandos and a cherry cola — $25.50. Should I place it?"*
3. User: *"I confirm"* (explicit)
4. Penny → `intent: "confirmed"`, reply: *"On it!"* → navigate

Between steps 2 and 3, the user can:
- Say "actually I want a shake too" → back to `intent: "ordering"`, cart updates, loop continues
- Say "cancel" → `intent: "cancelled"`, cart cleared, conversation ends
- Say "I confirm" → proceed to placement

The prompt enforces this gating: Penny will not return `intent: "confirmed"` unless she previously asked for confirmation AND the latest user message is an explicit confirm.

### Why "I confirm" specifically

The model latches onto distinctive phrases better than ambiguous "yes". A bare "yes" mid-conversation is too easily a yes to something else ("yes, with cheese"). Requiring an explicit confirmation phrase makes the intent transition unambiguous and reduces false-positive order placements.

---

## 2026-05-16 — Duplicate React in monorepo (Expo SDK downgrade fallout)

### Symptom
After downgrading from Expo SDK 55 to SDK 54 (so Expo Go on the Play Store could run the project), Metro bundled fine but the app crashed at render with:

```
ERROR  Invalid hook call. Hooks can only be called inside of the body of a function component.
ERROR  [TypeError: Cannot read property 'useRef' of null]
  at ContextNavigator
  at expo-router/build/global-state/router-store.js
```

The splash screen showed but the app never rendered past it.

### Root cause
The npm workspace ended up with **two different versions** of both React and React Native:

| Package | Root `node_modules` | `apps/mobile/node_modules` |
|---|---|---|
| `react` | `19.2.6` | `19.1.0` |
| `react-native` | `0.83.6` | `0.81.5` |

Why two copies? The downgrade only updated `apps/mobile/package.json`. Something at the workspace root (transitive peer dep, leftover lockfile entry) was still pinned to the SDK 55 versions, so npm couldn't deduplicate — it installed both side-by-side.

The crash flow: `expo-router` (mobile) imported `react` and got resolved to root's React 19.2.6. React Native's renderer (also resolved to a different copy) initialized the hook dispatcher on its own copy of React. So when `useRef` ran on root's React, `resolveDispatcher()` returned `null` because that copy of React never had a dispatcher installed.

### Fix
Two changes in tandem:

1. **`package.json` `overrides`** at the workspace root, pinning React and RN to single versions:
   ```json
   "overrides": {
     "react-native-worklets": "0.7.4",
     "react": "19.1.0",
     "react-dom": "19.1.0",
     "react-native": "0.81.5"
   }
   ```
2. **`metro.config.js` monorepo setup** so Metro looks in both the project's `node_modules` and the workspace root's:
   ```js
   config.watchFolders = [workspaceRoot];
   config.resolver.nodeModulesPaths = [
     path.resolve(projectRoot, "node_modules"),
     path.resolve(workspaceRoot, "node_modules"),
   ];
   ```

Then a clean reinstall: `rm -rf node_modules apps/*/node_modules package-lock.json && npm install`.

After the reinstall, only **one** copy of `react` and `react-native` existed, hoisted to root. App rendered correctly.

### Detour worth noting
While debugging, I added a Metro `resolver.blockList` to actively block "duplicate" paths. After the clean install the duplicates were gone, but the blockList was still there — now blocking the **only** copy of `react-native`. This produced a new error:

```
Unable to resolve "react-native/Libraries/Core/InitializeCore"
from "node_modules/@expo/metro-runtime/src/location/install.native.ts"
```

Lesson: don't leave defensive resolver rules in place after the underlying state changes. Once duplicates were eliminated by `overrides`, the blockList was actively harmful. Removed it.

### Why we ended up on SDK 54
SDK 55 is too new — the Expo Go app on the Play Store only supports up to SDK 54 right now. To use SDK 55, you'd need either an EAS dev build or a local native build. For this project we're optimizing for "demo-able via Expo Go on an Android phone."

### Takeaway for future me
When changing an Expo SDK version in a monorepo, the safe sequence is:
1. `npm install expo@<target>` in the workspace
2. `npx expo install --fix` to align all expo-* packages
3. **Check** root and per-workspace `react`/`react-native` versions match (`node -e "..."` or `npm ls react`)
4. If they don't, add `overrides` to root `package.json` for those packages, then nuke `node_modules` + lockfile and reinstall
5. Verify Metro monorepo config (`watchFolders`, `nodeModulesPaths`) is in place
