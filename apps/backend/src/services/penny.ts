import OpenAI from "openai";

import { MENU } from "../data/menu.js";
import type { CartSnapshotLine, OrderAction, PennyResponse } from "../types/order.js";

// Llama 4 Scout (17B MoE, 16 experts) — chosen after benchmarking on Groq:
//   - qwen/qwen3-32b:           reliable JSON, 1s–36s latency variance
//   - openai/gpt-oss-{20b,120b}: fast but Groq's JSON validator rejects them
//   - llama-3.3-70b-versatile:  good but skips PATTERN B (modifier-ask)
//   - meta-llama/llama-4-scout: **0.5–0.9s consistent, follows prompt rules
//                                cleanly across PATTERN A–G**
// Override via GROQ_MODEL env var if you want to try something else.
const MODEL = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// Number of prior turns to keep in context. Smaller = faster LLM round-trip
// (fewer input tokens to process). 6 turns ≈ 3 user + 3 Penny, plenty for
// the typical waitress-style conversation depth.
const HISTORY_TURNS = 6;

// Cap on Penny's reply length. Most replies are 1-2 sentences, but the JSON
// envelope adds ~50-100 tokens of structural overhead, and the close-out
// readback can run long. 500 is enough headroom for any legit response
// while still keeping the model from truly rambling.
const MAX_REPLY_TOKENS = 500;
const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;
const TIP_RATE = 0.15;

const itemAliases: Record<string, string[]> = {
  classic: ["classic smash", "classic smashes", "smash burger", "smash burgers", "smash", "classic"],
  double: ["double stack", "double stacks", "double burger", "double burgers", "double"],
  spicy: ["spicy chicken sando", "spicy chicken sandos", "spicy chicken", "chicken sando", "chicken sandwich", "spicy"],
  fish: ["crispy fish roll", "fish roll", "fish sandwich", "crispy fish", "fish"],
  fries: ["crinkle fries", "curly fries", "curly fry", "fries", "fry"],
  rings: ["onion rings", "rings"],
  shake: ["strawberry shake", "shake", "milkshake"],
  cola: ["cherry cola", "cola", "cherry coke", "coke zero", "coke", "soda"],
  bbq: ["bbq bacon burger", "barbecue bacon burger", "bbq burger", "bacon burger"],
  mushroom: ["mushroom swiss", "mushroom swiss burger", "swiss burger", "mushroom burger"],
  garden: ["garden smash", "the garden smash", "garden burger", "veggie burger", "veggie smash", "vegetarian burger"],
  tots: ["loaded tots", "tater tots", "tots"],
  slaw: ["house slaw", "slaw", "coleslaw", "cole slaw"],
  malt: ["chocolate malt", "malt", "chocolate shake"],
  lemonade: ["lemonade", "lemon aid", "lemonad", "lemondade", "lemondad", "lemon drink"],
  coffee: ["iced coffee", "ice coffee", "cold brew", "coffee"]
};

const pluralItemNames: Record<string, string> = {
  classic: "Classic Smashes",
  double: "Double Stacks",
  spicy: "Spicy Chicken Sandos",
  fish: "Crispy Fish Rolls",
  fries: "Crinkle Fries",
  rings: "Onion Rings",
  shake: "Strawberry Shakes",
  cola: "Cherry Colas",
  bbq: "BBQ Bacon Burgers",
  mushroom: "Mushroom Swisses",
  garden: "Garden Smashes",
  tots: "orders of Loaded Tots",
  slaw: "orders of House Slaw",
  malt: "Chocolate Malts",
  lemonade: "Lemonades",
  coffee: "Iced Coffees"
};

export type HistoryEntry = { role: "user" | "penny"; text: string };

const FALLBACK: PennyResponse = {
  reply: "Sorry, didn't catch that — try again?",
  actions: [{ type: "none" }],
  cartEffect: "no_cart_change"
};

function getClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });
}

function stripCodeFences(value: string): string {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeMessage(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function detectItemIds(text: string): string[] {
  const hits = new Set<string>();
  for (const [itemId, phrases] of Object.entries(itemAliases)) {
    if (phrases.some((phrase) => text.includes(phrase))) hits.add(itemId);
  }
  return Array.from(hits);
}

// Modifier-only message: contains "no X" / "extra Y" / "hold the X" style
// phrasing AND mentions no menu items by name. These messages should refer
// to whatever's already in the cart, not request something new.
function isModifierOnlyMessage(text: string): boolean {
  const normalized = normalizeMessage(text);
  if (!normalized) return false;
  const hasModifierKeywords = /\b(no|extra|hold|without|less|more|with)\b/.test(normalized);
  const mentionsItems = detectItemIds(normalized).length > 0;
  return hasModifierKeywords && !mentionsItems;
}

// Post-process LLM actions to fix the "duplicate-add" bug. When the user's
// message is modifier-only and the model returns a bare `add` for an item
// that's ALREADY in the cart, the cart store would merge by itemId and
// double the quantity. Convert each such `add` into [remove, add] so the
// existing line is replaced rather than incremented.
function dedupeModifierAdds(
  actions: OrderAction[],
  cartSnapshot: CartSnapshotLine[],
  userMessage: string
): OrderAction[] {
  if (!isModifierOnlyMessage(userMessage)) return actions;

  const cartItemIds = new Set(cartSnapshot.map((line) => line.itemId));
  // Track itemIds the model already removed, so we don't add a duplicate remove.
  const removedIds = new Set(
    actions.filter((a) => a.type === "remove").map((a) => (a as { itemId: string }).itemId)
  );

  const result: OrderAction[] = [];
  for (const action of actions) {
    if (action.type === "add" && cartItemIds.has(action.itemId) && !removedIds.has(action.itemId)) {
      result.push({ type: "remove", itemId: action.itemId });
      removedIds.add(action.itemId);
    }
    result.push(action);
  }
  return result;
}

function isOrderReadbackQuery(text: string): boolean {
  return (
    /\b(repeat|reiterate|recap|summarize|summary|review|go over|run through)\b.*\b(order|cart|bag)\b/.test(text) ||
    /\b(read|say|tell)\b.*\b(my|the current|current)\b.*\b(order|cart|bag)\b/.test(text) ||
    /\b(read|say|tell)\b.*\b(order|cart|bag)\b.*\b(back|again|now)\b/.test(text) ||
    /\b(read|say) it back\b/.test(text) ||
    /\bwhat(?:s| is)?\b.*\b(my|in my|in the|the current)\b.*\b(order|cart|bag)\b/.test(text) ||
    /\bwhat (?:do i have|have i ordered)\b/.test(text) ||
    /\bwhat(?:s| is)? on (?:my|the) order\b/.test(text) ||
    /\b(show|check|list)\b.*\b(my )?(order|cart|bag)\b/.test(text) ||
    /\b(order|cart|bag)\b.*\b(total|summary|recap)\b/.test(text) ||
    (!detectItemIds(text).length && /\b(total|how much|cost|amount due)\b/.test(text))
  );
}

function isMenuOverviewQuery(text: string): boolean {
  if (isOrderReadbackQuery(text)) return false;
  return (
    /\b(read|show|list|tell|summarize|summary|go over|walk me through)\b.*\b(menu)\b/.test(text) ||
    /\b(menu|what do you have|what can i order|what can i get|what are my options|what s good|whats good)\b/.test(text)
  );
}

function isRepeatLastReplyQuery(text: string): boolean {
  return /\b(repeat that|repeat please|repeat it|reiterate that|say that again|say it again|read that again|run that back|what did you say|come again)\b/.test(text);
}

function isInfoQuery(text: string): boolean {
  return /\b(what is|what s|whats|tell me about|what comes on|what comes in|what is in|what s in|whats in|describe|details|ingredients|calories|kcal|how many calories|how much|price|cost|contains|included)\b/.test(text);
}

function isExplicitCartEdit(text: string): boolean {
  return /\b(remove|delete|clear|empty|start over|scratch that|change|update|make it|actually|instead|swap|replace)\b/.test(text);
}

function isExplicitOrderRequest(text: string): boolean {
  return detectItemIds(text).length > 0;
}

function isResolvedItemRequest(text: string): boolean {
  return (
    detectItemIds(text).length > 0 &&
    /\b(as is|no changes|regular|standard|plain|hold|without|extra|add|light|sauce|side|mild|medium|hot|spicy)\b/.test(text)
  );
}

function isPendingClarificationReply(text: string, previousPennyText: string): boolean {
  const last = normalizeMessage(previousPennyText);
  if (!last) return false;
  const lastAskedForResolution = /\b(as is|any prep|prep notes|hold|holds|extra|extras|changes|tweak|regular|standard|whipped cream|salted)\b/.test(last);
  if (!lastAskedForResolution) return false;

  return /\b(as is|all good|no changes|no mods|regular|standard|yes|yeah|yep|no|none|hold|without|extra|add|light|sauce|side|mild|medium|hot|spicy)\b/.test(text);
}

function lastPennyText(history: HistoryEntry[]): string {
  return history.slice().reverse().find((entry) => entry.role === "penny")?.text ?? "";
}

function canLatestTurnMutateCart(
  message: string,
  history: HistoryEntry[],
  cartSnapshot: CartSnapshotLine[]
): boolean {
  const text = normalizeMessage(message);
  if (isInfoQuery(text) || isMenuOverviewQuery(text) || isOrderReadbackQuery(text) || isRepeatLastReplyQuery(text)) return false;
  if (isPendingClarificationReply(text, lastPennyText(history))) return true;
  if (cartSnapshot.length && isModifierOnlyMessage(text)) return true;
  return isExplicitCartEdit(text) || isExplicitOrderRequest(text) || isResolvedItemRequest(text);
}

function sanitizeLatestTurnActions(
  response: PennyResponse,
  cartSnapshot: CartSnapshotLine[],
  message: string,
  history: HistoryEntry[]
): PennyResponse {
  const scopedActions = dedupeModifierAdds(response.actions, cartSnapshot, message);
  if (!scopedActions.some((action) => action.type !== "none")) {
    return { ...response, actions: scopedActions };
  }

  if (canLatestTurnMutateCart(message, history, cartSnapshot)) {
    return { ...response, actions: scopedActions };
  }

  return cartSnapshot.length
    ? orderReadback(cartSnapshot)
    : {
        reply: "I haven't changed the order. Tell me what you'd like to add.",
        actions: [{ type: "none" }]
      };
}

function itemName(itemId: string): string {
  return MENU.find((item) => item.id === itemId)?.name ?? itemId;
}

function quantityFirstLine(line: CartSnapshotLine): string {
  const category = MENU.find((item) => item.id === line.itemId)?.category;
  if (category === "Sides") {
    const unit = line.qty === 1 ? "order" : "orders";
    return `${line.qty === 1 ? "one" : line.qty} ${unit} of ${itemName(line.itemId)}${line.note ? ` (${line.note})` : ""}`;
  }

  const name = line.qty === 1 ? itemName(line.itemId) : pluralItemNames[line.itemId] ?? `${itemName(line.itemId)}s`;
  return `${line.qty === 1 ? "one" : line.qty} ${name}${line.note ? ` (${line.note})` : ""}`;
}

function subtotalAmount(lines: CartSnapshotLine[]): number {
  return lines.reduce((sum, line) => {
    const price = MENU.find((item) => item.id === line.itemId)?.price ?? 0;
    return sum + price * line.qty;
  }, 0);
}

function tipAmount(lines: CartSnapshotLine[]): number {
  return subtotalAmount(lines) * TIP_RATE;
}

function amountDue(lines: CartSnapshotLine[]): number {
  const subtotal = subtotalAmount(lines);
  if (subtotal <= 0) return 0;
  return subtotal + subtotal * TAX_RATE + DELIVERY_FEE + tipAmount(lines);
}

function orderReadback(cartSnapshot: CartSnapshotLine[]): PennyResponse {
  if (!cartSnapshot.length) {
    return {
      reply: "There isn't anything in the order yet. Tell me what sounds good.",
      actions: [{ type: "none" }]
    };
  }

  const summary = cartSnapshot.map(quantityFirstLine).join(", ");

  return {
    reply: `Right now you have ${summary}. Total to pay is $${amountDue(cartSnapshot).toFixed(2)}. Important: that includes a ${Math.round(TIP_RATE * 100)}% tip of $${tipAmount(cartSnapshot).toFixed(2)}. Should I place it?`,
    actions: [{ type: "none" }],
    cartEffect: "no_cart_change"
  };
}

function menuOverview(): PennyResponse {
  return {
    reply: "BRGR keeps it tight: smash burgers, crispy chicken and fish sandos, sides like fries, rings, tots, and slaw, plus drinks, lemonade, shakes, malt, and iced coffee. Popular picks are the Classic Smash, Spicy Chicken Sando, Crinkle Fries, and Lemonade. Want a recommendation or details on one item?",
    actions: [{ type: "none" }],
    cartEffect: "no_cart_change"
  };
}

function buildSystemPrompt(cartSnapshot: CartSnapshotLine[]): string {
  return `You are Penny, the AI server at BRGR, pronounced "Burger" — a smash burger joint. Warm, casual, efficient. Talk like a great in-person server: short, friendly, no fluff.

MENU (source of truth for itemId, name, price, category, customization):
${JSON.stringify(MENU)}

CURRENT ORDER (what's ALREADY in the cart — this is the source of truth, never re-add what's already here):
${JSON.stringify(cartSnapshot)}

═══════════════════════════════════════════════════════════════════
HOW YOU RESPOND — JSON ONLY:

{
  "reply": string,                                    // short, casual, 1-2 sentences
  "cartEffect": "add_now" | "needs_resolution" | "already_in_cart" | "no_cart_change",
  "actions": Action[]                                 // changes to make to cart THIS turn
}

cartEffect is the explicit pivot for the client:
  "add_now"          → this turn has enough resolved info to add/update/remove now
  "needs_resolution" → Penny is asking a follow-up before cart mutation
  "already_in_cart"  → item is already present and user did not ask for another
  "no_cart_change"   → info/readback/menu/cancel/unclear turn

Action types:
  { "type": "add",    "itemId": string, "qty": number, "note"?: string }
  { "type": "remove", "itemId": string }
  { "type": "update", "itemId": string, "qty": number }
  { "type": "clear" }
  { "type": "none" }                                  // no cart change

═══════════════════════════════════════════════════════════════════
CRITICAL PATTERNS — these MUST be handled exactly:

PATTERN -1 · LATEST TURN OWNS CART MUTATION
Conversation history is context only. The ONLY text that can create actions is
the customer's latest message at the end of the prompt.
→ Do NOT add items because Penny or the customer mentioned them earlier.
→ Do NOT add items when the latest message asks to repeat, reiterate, recap,
  review, read back, list, show, or summarize anything.
→ If the latest message is informational/readback/reiteration, actions MUST be
  [{ "type": "none" }], even if item names appear in history.
→ You may use history only to resolve a pending clarification answer like
  "as-is", "no changes", "no pickles", or "extra cheese".

PATTERN 0 · MENU INFO QUESTION
If the customer asks what an item is, what's in it, what comes on it, calories,
ingredients, details, or to describe it:
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "no_cart_change"
→ answer using MENU.description, MENU.kcal, MENU.price, and customization.included.
→ Do not add the item unless they explicitly ask to add/order/get it.
→ Example: "The Spicy Chicken Sando is buttermilk-fried chicken with chili crunch,
slaw, and lime aioli. It's 620 calories and $11. Want to add it?"

PATTERN 0.25 · MENU OVERVIEW / READ THE MENU
If the customer asks to read, list, show, summarize, or go over the menu:
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "no_cart_change"
→ Give a SHORT category-level summary, not the full menu.
→ Mention at most 4 popular item examples total.
→ Do NOT read individual prices.
→ End by offering recommendations or details on one item.
→ Example: "BRGR has smash burgers, crispy chicken and fish sandos, sides like
fries and rings, plus drinks, shakes, and lemonade. Popular picks are the Classic
Smash, Spicy Chicken Sando, Crinkle Fries, and Lemonade. Want a recommendation?"

PATTERN 0.5 · ORDER READBACK / CART STATUS
If the customer asks to repeat, read back, summarize, show, list, or check their
order/cart, or asks for the order total:
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "no_cart_change"
→ Use CURRENT ORDER only. Do not infer items from chat history.
→ NEVER add, update, or remove items just because you mention them in the reply.
→ If CURRENT ORDER is empty, say there is nothing in the order yet.
→ Use quantity-first phrasing, never "x2": "2 Spicy Chicken Sandos", not "Spicy Chicken Sando x2".
→ The reply MUST end with "Should I place it?"
→ When stating the total, ALWAYS explicitly state the included 15% tip amount.
→ Example: "Right now you have one Spicy Chicken Sando and 2 Cherry Colas.
Total to pay is $31.55. Important: that includes a 15% tip of $3.45.
Should I place it?"

PATTERN 1 · ORDER RESOLUTION CHECKLIST
For every item the customer is trying to order, these four boxes must be resolved
before you ask whether they are done:
1. item: the menu item is identified.
2. quantity: use the stated quantity; if none is stated, resolve it as one and say "one" back.
3. notes: prep notes like sauce on the side, well done, light ice, etc.
4. accommodations/extras: holds/removals and add-ons from customization.holdable/customization.extras.

If item + quantity are known but notes/accommodations/extras are not resolved:
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "needs_resolution"
→ ask one concise item-specific follow-up that covers notes, accommodations, and extras together.
→ Example: "One spicy chicken sando. Any prep notes, slaw/aioli changes, or extras, or as-is?"
→ Do not add the item yet.

If the customer answers the follow-up with "as-is", "all good", "no changes",
or gives the requested notes/accommodations/extras:
→ add the item with the resolved qty and note if needed.
→ cartEffect MUST be "add_now"
→ reply MUST end by asking "Will that be all?"

PATTERN A · CLOSE-OUT
If the customer message means "I'm done ordering" — examples: "that's it",
"thats it", "I'm good", "I'm done", "no thanks", "all good", "good for now",
"checkout", "place order", "send it", "that's all":
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "no_cart_change"
→ reply: ask for confirmation, not placement. Example: "Perfect — I'll read it back before placing it."
→ NEVER re-add items that are already in CURRENT ORDER (that creates duplicates)
→ NEVER say the order is placed, sent, or in the kitchen. The app handles final confirmation.

PATTERN B · ITEM WITH NO NOTES / ACCOMMODATIONS / EXTRAS SPECIFIED
If customer orders an item with customization data and does NOT mention a hold,
extra, heat, sauce, prep note, or other modifier:

REQUIRED OUTPUT SHAPE:
→ actions: [{ "type": "none" }]   ← DO NOT add the item yet
→ cartEffect: "needs_resolution"
→ reply MUST satisfy ALL of:
   (a) State the resolved quantity + item name out loud
   (b) Name AT LEAST TWO specific modifier options pulled from THAT item's
       customization.holdable or customization.extras list. Don't say
       generic words like "any changes" or "any modifications" alone —
       name them.
   (c) Offer the "as-is" escape hatch at the end
   (d) End with a question mark
→ Templates (read the customization data for the specific item, pull from holdable/extras):
   Classic Smash:  "One Classic Smash. Hold the pickles, secret sauce, onion, or cheese — or want it as-is?"
   Spicy Chicken:  "One Spicy Chicken Sando. Tweak the chili crunch, slaw, or aioli, or want it as-is?"
   BBQ Bacon:      "One BBQ Bacon Burger. Hold the bacon, BBQ sauce, or pickles, or want it as-is?"
   Mushroom Swiss: "One Mushroom Swiss. Any changes to the mushrooms, Swiss, or caramelized onions, or as-is?"
   Loaded Tots:    "One order of Loaded Tots. Hold the bacon, cheddar, scallions, or ranch — or want it loaded as-is?"
   Strawberry Shake:"One Strawberry Shake. Whipped cream, or hold that?"
   Lemonade:       "One Lemonade. Standard, or add strawberry purée or mint?"

❌ FORBIDDEN REPLY SHAPES (these are bugs):
   "I'll read them out, hold tight"           ← deferring, not asking
   "Let me know what you'd like"              ← vague, no options
   "Any modifications?"                       ← no specific options named
   "Coming right up"                          ← not asking at all
   "Want anything else with that?"            ← wrong question, that's PATTERN A
   Any reply that doesn't list specific item-specific options + end with "?"

If you find yourself wanting to defer, STOP. Ask the question NOW, this turn.

PATTERN C · CUSTOMER SPECIFIES A MODIFIER
"no pickles" / "extra cheese" / "no slaw" / "extra aioli" / "well done" / "spicy" / "hold the X":
→ cartEffect MUST be "add_now"
→ Set the "note" field on the add. Example:
   "chicken sando no pickles" → { "type": "add", "itemId": "spicy", "qty": 1, "note": "no pickles" }
→ If customer says "no pickles on one" of multiple, split into two adds:
   { "type": "add", "itemId": "spicy", "qty": 1, "note": "no pickles" },
   { "type": "add", "itemId": "spicy", "qty": 1 }

PATTERN D · MODIFIER ON ITEM ALREADY IN CART (the most common bug!)
When the customer's latest message is JUST a modifier ("no pickles", "extra
cheese", "make it spicy", "actually hold the bun") and CURRENT ORDER already
contains a matching item — you MUST replace that line, not add a new one.
Bare \`add\` will DOUBLE THE QUANTITY because the cart merges by itemId.

Correct shape — two actions in order, remove THEN add:
  CURRENT ORDER: [{ "itemId": "bbq", "qty": 1 }]
  User: "no pickles"
  → actions: [
      { "type": "remove", "itemId": "bbq" },
      { "type": "add", "itemId": "bbq", "qty": 1, "note": "no pickles" }
    ]

If the customer wants the modifier on ONE of multiple ("no pickles on one"):
  CURRENT ORDER: [{ "itemId": "spicy", "qty": 2 }]
  User: "no pickles on one"
  → actions: [
      { "type": "remove", "itemId": "spicy" },
      { "type": "add", "itemId": "spicy", "qty": 1, "note": "no pickles" },
      { "type": "add", "itemId": "spicy", "qty": 1 }
    ]

NEVER respond with a lone \`add\` when the same itemId is already in CURRENT ORDER
unless the customer EXPLICITLY asked for an additional one ("can I get another
burger"). Modifier-only messages = remove + add.

PATTERN E · QUANTITY (be exact, never invent)
"a" / "an" / "one" / "1" / "single" → qty: 1
"two" / "2" / "couple" / "pair"     → qty: 2
"three" / "3"                        → qty: 3
Etc. If customer didn't specify, default qty: 1. NEVER guess higher.

PATTERN F · ITEM NOT ON THE MENU (no fuzzy substitutes!)
If the customer asks for something that does NOT match any MENU entry — not
by name, not by category, not by a reasonable nickname:
→ actions MUST be [{ "type": "none" }]
→ cartEffect MUST be "no_cart_change"
→ reply CLEARLY says BRGR doesn't have that, then optionally points them at
  what IS on the menu. Examples:
   "Sorry, we don't have hot dogs at BRGR — we're burgers, sandwiches,
    sides, drinks. Want me to suggest something?"
   "We don't carry milkshakes vanilla flavor — we have a Strawberry Shake
    and a Chocolate Malt. Either work?"
→ DO NOT silently substitute (e.g. user asks for "pizza" → you add a
  Classic Smash). Confirm what they want before adding anything.
→ "Reasonable nickname" means well-established synonyms only:
   "coke"/"soda" → Cherry Cola, "milkshake" → Strawberry Shake,
   "curly fries" → Crinkle Fries, "veggie burger" → The Garden Smash.
   If unsure, ask, don't guess.

PATTERN G · PRICES (almost never mention them out loud)
The customer can see prices in the app. Do NOT read individual item prices
in your replies unless:
  (a) The customer explicitly asks ("how much is the smash?", "what's the
      price?", "what do I owe?")
  (b) You're doing a readback/summary of the WHOLE cart for confirmation —
      in which case give the TOTAL and explicitly state the included 15% tip amount.

WRONG: "One BBQ Bacon Burger, that's $11.50. Anything else?"
WRONG: "Adding Crinkle Fries — $4.50. Will that be all?"
RIGHT: "One BBQ Bacon Burger. Anything else?"
RIGHT (readback only): "So that's a BBQ Bacon Burger and a Lemonade.
       Total to pay is $19.84, including a 15% tip of $2.25. Should I place it?"

═══════════════════════════════════════════════════════════════════
SOFT RULES (waitress style):

- After an item is fully resolved and added, ALWAYS ask "Will that be all?"
- If CURRENT ORDER already has a Drinks item, do not ask "anything to drink?" again.
- If CURRENT ORDER already has a Sides item, do not ask "side with that?" again.
- Do not ask side/drink upsells inside the core item-resolution loop. Wait for the user
  to say they also want something or ask for a recommendation.
- If they already have a drink or side, use "Will that be all?" after resolving the current item.
- After 2+ items, occasionally summarize: "So that's two sandos and a fries.
  Will that be all?"
- Match menu items flexibly: "spicy chicken" → "spicy", "smash burger" → "classic",
  "curly fries" → "fries", "shake" → "shake",
  "coke" / "coke zero" / "soda" → "cola", "lemon aid" → "lemonade".
- If item isn't on menu (see PATTERN F): say so kindly, use [{ "type": "none" }],
  do NOT invent a substitute.
- If the customer asks for another Coke/cola and cola is already in CURRENT ORDER,
  add one more only when they clearly want another. Otherwise acknowledge it is already there.
- If an item is already in CURRENT ORDER and the latest user turn does not clearly
  ask for another/additional one, use cartEffect "already_in_cart" and no actions.

═══════════════════════════════════════════════════════════════════
ANTI-PATTERNS — never do these:

✗ Don't add an empty "note": "" — omit the field if no modifier.
✗ Don't use grammar words ("sandwich", "burger") as a note.
✗ Don't invent quantities the customer didn't say.
✗ Don't say "Chicken Sando x2" in replies — say "2 Chicken Sandos".
✗ Don't re-add items already in CURRENT ORDER on close-out turns.
✗ Don't ask the same modifier question again after the customer answered it.
✗ Don't keep asking about drinks when there is already a drink in CURRENT ORDER.
✗ Don't read item prices in conversational replies. Prices ONLY in the
  final readback total OR when the customer explicitly asks.
✗ Don't read the whole menu. Menu overview requests get a short category summary.
✗ Don't silently substitute an off-menu request with a menu item — ask first.
✗ Don't defer the modifier question to a later turn ("I'll read them out").
  When PATTERN B applies, you MUST ask the specific-option question THIS turn,
  with at least two named options from the item's customization data.
✗ Don't output anything outside the JSON object — no markdown, no prose.`;
}

export async function parseOrderWithPenny(
  message: string,
  cartSnapshot: CartSnapshotLine[],
  sessionId: string,
  history: HistoryEntry[] = []
): Promise<PennyResponse> {
  void sessionId;
  const normalizedMessage = normalizeMessage(message);
  if (isMenuOverviewQuery(normalizedMessage)) {
    return menuOverview();
  }

  if (isOrderReadbackQuery(normalizedMessage)) {
    return orderReadback(cartSnapshot);
  }

  if (isRepeatLastReplyQuery(normalizedMessage)) {
    const previousReply = lastPennyText(history);
    return {
      reply: previousReply || "I can repeat the order or answer a menu question. What would you like to hear again?",
      actions: [{ type: "none" }],
      cartEffect: "no_cart_change"
    };
  }

  const client = getClient();
  if (!client) return FALLBACK;

  // Keep only the most recent N turns to bound token usage.
  const recentHistory = history.slice(-HISTORY_TURNS);

  const historyMessages = recentHistory.map((entry) => ({
    role: entry.role === "penny" ? ("assistant" as const) : ("user" as const),
    content: entry.text
  }));

  // Groq's strict JSON validator rejects gpt-oss output even when it's
  // valid JSON — skip the response_format flag for those models and trust
  // the model + our stripCodeFences() to deliver parseable output.
  const useJsonMode = !MODEL.startsWith("openai/gpt-oss");

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      ...(useJsonMode ? { response_format: { type: "json_object" as const } } : {}),
      // Cap reply length to keep TTFT + TTS turnaround tight.
      max_tokens: MAX_REPLY_TOKENS,
      messages: [
        { role: "system", content: buildSystemPrompt(cartSnapshot) },
        ...historyMessages,
        { role: "user", content: message }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(stripCodeFences(raw)) as PennyResponse;

    if (!parsed.reply || !Array.isArray(parsed.actions)) {
      return FALLBACK;
    }

    return sanitizeLatestTurnActions(parsed, cartSnapshot, message, recentHistory);
  } catch (err) {
    console.warn("[penny] LLM call failed:", err instanceof Error ? err.message : err);
    return FALLBACK;
  }
}

export function getGroqModel(): string {
  return MODEL;
}
