import "react-native-get-random-values";

import { useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { MENU } from "../data/menu";
import { parseOrder, type CartEffect, type HistoryEntry } from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useSessionStore } from "../store/sessionStore";
import type { CartLine, OrderAction, PennyIntent } from "../types/order";

type PendingOrderLine = {
  itemId: string;
  qty: number;
  note?: string;
};

type DetectedOrderLine = PendingOrderLine & {
  resolved: boolean;
};

type ItemMention = {
  itemId: string;
  phrase: string;
  index: number;
  end: number;
};

// How many prior turns to send to Penny each request. Kept in sync with the
// backend's HISTORY_TURNS — no point shipping turns the backend will trim off.
const HISTORY_TURNS = 6;
const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;
const TIP_RATE = 0.15;

const menuById = new Map(MENU.map((item) => [item.id, item]));

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

const CLOSEOUT_PHRASES = new Set([
  "no",
  "nope",
  "nah",
  "no thanks",
  "no thank you",
  "nothing else",
  "nothing else thanks",
  "thats it",
  "that s it",
  "thats all",
  "that s all",
  "im good",
  "i m good",
  "im done",
  "i m done",
  "all good",
  "good for now",
  "checkout",
  "place order",
  "send it",
  "done"
]);

const CONFIRM_PHRASES = new Set([
  "confirm",
  "confirm order",
  "confirmed",
  "i confirm",
  "yes i confirm",
  "looks good",
  "sounds good",
  "that looks right",
  "thats right",
  "that s right",
  "place it",
  "do it"
]);

const CANCEL_PHRASES = new Set([
  "cancel",
  "cancel order",
  "cancel it",
  "never mind",
  "nevermind",
  "start over",
  "scratch that"
]);

const AFFIRMATIVE_PHRASES = new Set(["yes", "yeah", "yep", "yes please", "correct", "right"]);

const itemAliases: Record<string, string[]> = {
  classic: ["classic smash", "classic smashes", "smash burger", "smash burgers", "smash", "classic"],
  double: ["double stack", "double stacks", "double burger", "double burgers", "double"],
  spicy: ["spicy chicken sando", "spicy chicken sandos", "spicy chicken sandwich", "spicy chicken sandwiches", "spicy chicken", "spicy chickens", "chicken sando", "chicken sandos", "chicken sandwich", "chicken sandwiches", "spicy"],
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

function normalizeMessage(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  single: 1,
  another: 1,
  two: 2,
  couple: 2,
  pair: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeMessage(phrase);
  if (!normalizedPhrase) return false;
  return new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?=\\s|$)`).test(text);
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function quantityFirstLine(line: CartLine): string {
  const itemName = menuById.get(line.itemId)?.name ?? line.itemId;
  const category = menuById.get(line.itemId)?.category;
  if (category === "Sides") {
    const unit = line.qty === 1 ? "order" : "orders";
    return `${line.qty === 1 ? "one" : line.qty} ${unit} of ${itemName}${line.note ? ` (${line.note})` : ""}`;
  }

  const name = line.qty === 1 ? itemName : pluralItemNames[line.itemId] ?? `${itemName}s`;
  const note = line.note ? ` (${line.note})` : "";
  return `${line.qty === 1 ? "one" : line.qty} ${name}${note}`;
}

function summarizeLines(lines: CartLine[]): string {
  return joinWithAnd(lines.map(quantityFirstLine));
}

function formatPendingLine(line: PendingOrderLine): string {
  return quantityFirstLine(line);
}

function quantityFirstActionLine(action: Extract<OrderAction, { type: "add" }>): string {
  return quantityFirstLine({
    itemId: action.itemId,
    qty: action.qty,
    note: action.note
  });
}

function hasAddAction(actions: OrderAction[]): boolean {
  return actions.some((action) => action.type === "add");
}

function shouldForcePostAddCloseout(reply: string, actions: OrderAction[]): boolean {
  if (!hasAddAction(actions)) return false;
  const text = normalizeMessage(reply);
  if (/\b(total is|total comes|should i place|say i confirm|confirm and i|placing it|sending it|order is in)\b/.test(text)) {
    return true;
  }
  return !/\b(will that be all|anything else|is that it for now|that all)\b/.test(text);
}

function forcePostAddCloseout(reply: string, actions: OrderAction[]): string {
  if (!shouldForcePostAddCloseout(reply, actions)) return reply;
  const added = actions.filter((action): action is Extract<OrderAction, { type: "add" }> => action.type === "add");
  const text = normalizeMessage(reply);
  if (/\b(total is|total comes|should i place|say i confirm|confirm and i|placing it|sending it|order is in)\b/.test(text)) {
    return `Added ${joinWithAnd(added.map(quantityFirstActionLine))}. Will that be all?`;
  }
  return `${reply.replace(/[.?!\s]*$/, "")}. Will that be all?`;
}

function formatOrderReadback(lines: CartLine[]): string {
  return `Right now you have ${summarizeLines(lines)}. Total to pay is $${amountDue(lines).toFixed(2)}. Important: that includes a ${Math.round(TIP_RATE * 100)}% tip of $${tipAmount(lines).toFixed(2)}. Should I place it?`;
}

function subtotalAmount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    const price = menuById.get(line.itemId)?.price ?? 0;
    return sum + price * line.qty;
  }, 0);
}

function tipAmount(lines: CartLine[]): number {
  return subtotalAmount(lines) * TIP_RATE;
}

function amountDue(lines: CartLine[]): number {
  const subtotal = subtotalAmount(lines);
  if (subtotal <= 0) return 0;
  return subtotal + subtotal * TAX_RATE + DELIVERY_FEE + tipAmount(lines);
}

function lastPennyText(messages: { role: "user" | "penny"; text: string }[]): string {
  return messages.slice().reverse().find((message) => message.role === "penny")?.text ?? "";
}

function isCloseoutQuestion(value: string): boolean {
  const text = normalizeMessage(value);
  return /\b(will that be all|is that it for now|that s it|that s all|that all|all for now|done for now|good for now|ready to checkout|checkout|should i place it|should i place the order|want me to place it|do you want me to place it)\b/.test(text);
}

function isBackendCloseoutReply(value: string): boolean {
  const text = normalizeMessage(value);
  return /\b(sending it through|send it through|sent it through|placing it|place it|be ready soon|order is in|on it)\b/.test(text);
}

function onlyNoopActions(actions: OrderAction[]): boolean {
  return actions.length === 0 || actions.every((action) => action.type === "none");
}

function linesHaveCategory(lines: CartLine[], category: (typeof MENU)[number]["category"]): boolean {
  return lines.some((line) => menuById.get(line.itemId)?.category === category);
}

function actionsAddCategory(actions: OrderAction[], category: (typeof MENU)[number]["category"]): boolean {
  return actions.some((action) => action.type === "add" && menuById.get(action.itemId)?.category === category);
}

function cleanRepeatedPrompts(reply: string, currentLines: CartLine[], actions: OrderAction[]): string {
  const hasDrink = linesHaveCategory(currentLines, "Drinks") || actionsAddCategory(actions, "Drinks");
  const hasSide = linesHaveCategory(currentLines, "Sides") || actionsAddCategory(actions, "Sides");

  let clean = reply;

  if (hasDrink) {
    clean = clean.replace(
      /\b(?:anything to drink|want (?:to add )?(?:a )?(?:drink|coke|cola|soda|shake)|add (?:a )?(?:drink|coke|cola|soda|shake))(?:\?)?/gi,
      "Anything else?"
    );
  }

  if (hasSide) {
    clean = clean.replace(
      /\b(?:want (?:a )?side(?: with that)?|side with that|add (?:a )?side)(?:\?)?/gi,
      "Anything else?"
    );
  }

  return clean.replace(/\s+/g, " ").trim();
}

function detectItemIds(text: string): string[] {
  const hits = new Set<string>();
  for (const [itemId, phrases] of Object.entries(itemAliases)) {
    if (phrases.some((phrase) => hasPhrase(text, phrase))) hits.add(itemId);
  }
  return Array.from(hits);
}

function detectItemMentions(text: string): ItemMention[] {
  const mentions: ItemMention[] = [];

  for (const [itemId, phrases] of Object.entries(itemAliases)) {
    let best: ItemMention | null = null;
    for (const phrase of phrases) {
      const normalizedPhrase = normalizeMessage(phrase);
      if (!normalizedPhrase) continue;
      const match = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?=\\s|$)`).exec(text);
      if (!match) continue;
      const offset = match[0].startsWith(" ") ? 1 : 0;
      const index = match.index + offset;
      const mention = {
        itemId,
        phrase: normalizedPhrase,
        index,
        end: index + normalizedPhrase.length
      };
      if (
        !best ||
        mention.index < best.index ||
        (mention.index === best.index && mention.phrase.length > best.phrase.length)
      ) {
        best = mention;
      }
    }
    if (best) mentions.push(best);
  }

  return mentions.sort((a, b) => a.index - b.index);
}

function parseQuantityBefore(text: string, index: number): number {
  const before = text.slice(Math.max(0, index - 48), index).trim();
  if (!before) return 1;
  const tokens = before.split(/\s+/).filter(Boolean).slice(-6);

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (/^\d+$/.test(token)) return Math.max(1, Math.min(20, Number(token)));
    if (NUMBER_WORDS[token]) return NUMBER_WORDS[token];
  }

  return 1;
}

function optionVariants(value: string): string[] {
  const normalized = normalizeMessage(value).replace(/^extra\s+/, "");
  const parts = normalized.split(/\s+/).filter(Boolean);
  const variants = new Set([normalized]);
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last && !["bun", "dip", "syrup"].includes(last)) {
    variants.add(last);
  }
  return Array.from(variants).filter(Boolean);
}

function optionPattern(prefix: string, option: string) {
  return new RegExp(`\\b${prefix}\\s+(?:the\\s+)?${escapeRegExp(option)}\\b`);
}

function isAsIsResolution(text: string): boolean {
  return /\b(as is|as-is|no changes?|no mods?|no modifications?|regular|standard|plain|all good|that s fine|thats fine|yes|yeah|yep|no|none)\b/.test(text);
}

function extractResolutionNote(text: string, itemId: string): { resolved: boolean; note?: string } {
  const item = menuById.get(itemId);
  const noteParts: string[] = [];

  for (const holdable of item?.customization?.holdable ?? []) {
    for (const variant of optionVariants(holdable)) {
      if (
        optionPattern("(?:no|hold|without|remove|skip)", variant).test(text) ||
        new RegExp(`\\b${escapeRegExp(variant)}\\s+(?:off|removed)\\b`).test(text)
      ) {
        noteParts.push(`no ${holdable}`);
        break;
      }
    }
  }

  for (const extra of item?.customization?.extras ?? []) {
    for (const variant of optionVariants(extra.name)) {
      if (
        hasPhrase(text, extra.name) ||
        optionPattern("(?:extra|add|more|with)", variant).test(text)
      ) {
        noteParts.push(extra.name.startsWith("extra ") ? extra.name : `add ${extra.name}`);
        break;
      }
    }
  }

  const generalMatches = text.match(/\b(?:no|hold|without|light|extra|add|more)\s+[a-z]+(?:\s+[a-z]+)?/g) ?? [];
  for (const match of generalMatches) {
    if (!detectItemIds(match).length) noteParts.push(match);
  }

  if (/\bsauce on (?:the )?side\b/.test(text)) noteParts.push("sauce on the side");
  if (/\bwell done\b/.test(text)) noteParts.push("well done");
  if (/\b(?:mild|medium|hot)\b/.test(text)) noteParts.push(text.match(/\b(?:mild|medium|hot)\b/)?.[0] ?? "");

  const uniqueNotes = Array.from(new Set(noteParts.map((part) => part.trim()).filter(Boolean)));
  if (uniqueNotes.length) return { resolved: true, note: uniqueNotes.join(", ") };
  if (isAsIsResolution(text)) return { resolved: true };
  return { resolved: false };
}

function parseDeterministicOrderRequest(text: string): DetectedOrderLine[] {
  const mentions = detectItemMentions(text);
  if (!mentions.length) return [];

  return mentions.map((mention, index) => {
    const nextMention = mentions[index + 1];
    const segment = text.slice(Math.max(0, mention.index - 24), nextMention?.index ?? text.length);
    const resolution = extractResolutionNote(segment, mention.itemId);
    const globalResolution = isAsIsResolution(text) || /\b(all|everything|both|them)\s+(?:as is|regular|standard|plain|no changes?)\b/.test(text);

    return {
      itemId: mention.itemId,
      qty: parseQuantityBefore(text, mention.index),
      note: resolution.note,
      resolved: resolution.resolved || globalResolution
    };
  });
}

function buildAddActions(lines: PendingOrderLine[]): OrderAction[] {
  return lines.map((line) => ({
    type: "add",
    itemId: line.itemId,
    qty: line.qty,
    ...(line.note ? { note: line.note } : {})
  }));
}

function formatAddedReply(lines: PendingOrderLine[]): string {
  return `Added ${joinWithAnd(lines.map(formatPendingLine))}. Will that be all?`;
}

function formatResolutionPrompt(lines: PendingOrderLine[]): string {
  if (lines.length === 1) {
    const item = menuById.get(lines[0].itemId);
    return `${formatPendingLine(lines[0])}. ${item?.customization?.prompt ?? "Any changes, or as-is?"}`;
  }

  const hints = lines.map((line) => {
    const item = menuById.get(line.itemId);
    const options = [
      ...(item?.customization?.holdable ?? []).slice(0, 2).map((option) => `hold ${option}`),
      ...(item?.customization?.extras ?? []).slice(0, 2).map((extra) => `add ${extra.name}`)
    ];
    return `${item?.name ?? line.itemId}: ${joinWithAnd(options)}`;
  });

  return `For ${joinWithAnd(lines.map(formatPendingLine))}: ${hints.join("; ")} — or want everything as-is?`;
}

function replySaysAlreadyInCart(reply: string): boolean {
  return /\b(already|right now you have|currently have|in your (?:cart|order)|on your (?:cart|order))\b/.test(normalizeMessage(reply));
}

function replyAsksForResolution(reply: string): boolean {
  const text = normalizeMessage(reply);
  return (
    /\?\s*$/.test(reply.trim()) &&
    /\b(as is|changes?|tweak|hold|extra|add|standard|regular|plain|salted|sauce|ice|whipped cream|cream and sugar|loaded)\b/.test(text) &&
    !/\b(will that be all|anything else|should i place)\b/.test(text)
  );
}

function replySaysAddStage(reply: string): boolean {
  const text = normalizeMessage(reply);
  if (replySaysAlreadyInCart(reply) || replyAsksForResolution(reply)) return false;
  return /\b(added|adding|got it|i ve got|ive got|i got|you got it|all set|coming right up|perfect|will that be all|anything else|is that it)\b/.test(text);
}

function resolvePendingLines(lines: PendingOrderLine[], text: string): PendingOrderLine[] {
  return lines.map((line) => {
    if (line.note) return line;
    const resolution = extractResolutionNote(text, line.itemId);
    return { ...line, note: resolution.note };
  });
}

function reconcileCartEffect(args: {
  currentLines: CartLine[];
  deterministicLines: DetectedOrderLine[];
  normalizedMessage: string;
  pendingLines: PendingOrderLine[];
  reply: string;
  actions: OrderAction[];
  cartEffect?: CartEffect;
}): { actions: OrderAction[]; pendingLines: PendingOrderLine[]; reply: string } {
  const { cartEffect, deterministicLines, normalizedMessage, pendingLines, reply } = args;

  if (cartEffect === "already_in_cart" || replySaysAlreadyInCart(reply)) {
    return { actions: [{ type: "none" }], pendingLines: [], reply };
  }

  if (pendingLines.length) {
    const resolvedLines = resolvePendingLines(pendingLines, normalizedMessage);
    const userResolvedPending =
      isAsIsResolution(normalizedMessage) ||
      resolvedLines.some((line, index) => line.note && line.note !== pendingLines[index]?.note);

    if (
      (cartEffect === "needs_resolution" || replyAsksForResolution(reply)) &&
      !userResolvedPending &&
      !hasAddAction(args.actions)
    ) {
      return { actions: [{ type: "none" }], pendingLines, reply };
    }

    if (!userResolvedPending && !hasAddAction(args.actions) && cartEffect !== "add_now" && !replySaysAddStage(reply)) {
      return { actions: [{ type: "none" }], pendingLines, reply };
    }

    const actions = hasAddAction(args.actions) ? args.actions : buildAddActions(resolvedLines);
    return { actions, pendingLines: [], reply: forcePostAddCloseout(reply, actions) };
  }

  if (!deterministicLines.length) {
    return { actions: args.actions, pendingLines: [], reply };
  }

  const lines = deterministicLines.map(({ resolved, ...line }) => line);

  if (
    cartEffect === "needs_resolution" ||
    replyAsksForResolution(reply) ||
    (cartEffect !== "add_now" && deterministicLines.some((line) => !line.resolved))
  ) {
    return { actions: [{ type: "none" }], pendingLines: lines, reply };
  }

  if (hasAddAction(args.actions)) {
    return { actions: args.actions, pendingLines: [], reply: forcePostAddCloseout(reply, args.actions) };
  }

  if (cartEffect === "add_now" || replySaysAddStage(reply) || deterministicLines.every((line) => line.resolved)) {
    const actions = buildAddActions(lines);
    return { actions, pendingLines: [], reply: forcePostAddCloseout(reply, actions) };
  }

  return { actions: [{ type: "none" }], pendingLines: lines, reply };
}

function isInfoQuery(text: string): boolean {
  return /\b(what is|what s|whats|tell me about|what comes on|what comes in|what is in|what s in|whats in|describe|details|ingredients|calories|kcal|how many calories|how much|price|cost|contains|included)\b/.test(text);
}

function isMenuOverviewQuery(text: string): boolean {
  if (isOrderReadbackQuery(text)) return false;
  return (
    /\b(read|show|list|tell|summarize|summary|go over|walk me through)\b.*\b(menu)\b/.test(text) ||
    /\b(menu|what do you have|what can i order|what can i get|what are my options|what s good|whats good)\b/.test(text)
  );
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

function isRepeatLastReplyQuery(text: string): boolean {
  return /\b(repeat that|repeat please|repeat it|reiterate that|say that again|say it again|read that again|run that back|what did you say|come again)\b/.test(text);
}

function hasCartMutation(actions: OrderAction[]): boolean {
  return actions.some((action) => action.type !== "none");
}

function isExplicitCartEdit(text: string): boolean {
  return /\b(remove|delete|clear|empty|start over|scratch that|change|update|make it|actually|instead|swap|replace)\b/.test(text);
}

function isExplicitOrderRequest(text: string): boolean {
  if (!detectItemIds(text).length) return false;
  return true;
}

function isResolvedItemRequest(text: string): boolean {
  return (
    detectItemIds(text).length > 0 &&
    /\b(as is|no changes|regular|standard|plain|hold|without|extra|add|light|sauce|side|mild|medium|hot|spicy)\b/.test(text)
  );
}

function isModifierOnlyUpdate(text: string): boolean {
  return (
    !detectItemIds(text).length &&
    (/\b(no|hold|without|less|light)\s+\w+/.test(text) || /\b(extra|add|more)\s+\w+/.test(text))
  );
}

function isPendingClarificationReply(text: string, previousPennyText: string): boolean {
  const last = normalizeMessage(previousPennyText);
  if (!last) return false;
  const lastAskedForResolution = /\b(as is|any prep|prep notes|hold|holds|extra|extras|changes|tweak|regular|standard|whipped cream|salted)\b/.test(last);
  if (!lastAskedForResolution) return false;

  return /\b(as is|all good|no changes|no mods|regular|standard|yes|yeah|yep|no|none|hold|without|extra|add|light|sauce|side|mild|medium|hot|spicy)\b/.test(text);
}

function canLatestTurnMutateCart(text: string, previousPennyText: string, cartLines: CartLine[]): boolean {
  if (isInfoQuery(text) || isMenuOverviewQuery(text) || isOrderReadbackQuery(text) || isRepeatLastReplyQuery(text)) return false;
  if (isPendingClarificationReply(text, previousPennyText)) return true;
  if (CLOSEOUT_PHRASES.has(text) || AFFIRMATIVE_PHRASES.has(text) || CANCEL_PHRASES.has(text)) return false;
  return (
    isExplicitCartEdit(text) ||
    isExplicitOrderRequest(text) ||
    isResolvedItemRequest(text) ||
    (cartLines.length > 0 && isModifierOnlyUpdate(text))
  );
}

function formatMenuInfo(itemId: string): string {
  const item = menuById.get(itemId);
  if (!item) return "I don't have that one on the menu right now.";

  const included = item.customization?.included.length
    ? ` It comes with ${joinWithAnd(item.customization.included)}.`
    : "";
  const extras = item.customization?.extras.length
    ? ` You can add ${joinWithAnd(item.customization.extras.map((extra) => extra.name))}.`
    : "";

  return `${item.name} is $${item.price.toFixed(2)} and ${item.kcal} calories. ${item.description}${included}${extras}`;
}

function formatMenuOverview(): string {
  return "BRGR keeps it tight: smash burgers, crispy chicken and fish sandos, sides like fries, rings, tots, and slaw, plus drinks, lemonade, shakes, malt, and iced coffee. Popular picks are the Classic Smash, Spicy Chicken Sando, Crinkle Fries, and Lemonade. Want a recommendation or details on one item?";
}

export function useBasicPenny() {
  const applyActions = useCartStore((state) => state.applyActions);
  const sessionId = useSessionStore((state) => state.sessionId);
  const addMessage = useSessionStore((state) => state.addMessage);
  const pendingAddsRef = useRef<PendingOrderLine[]>([]);

  async function handleSend(
    message: string,
    options: { intent?: PennyIntent } = {}
  ): Promise<{ reply: string; chips?: string[]; intent?: PennyIntent }> {
    // Snapshot the conversation BEFORE adding the new user message so the
    // backend gets just the prior turns as context.
    const priorMessages = useSessionStore.getState().messages;
    const currentLines = useCartStore.getState().lines;
    const history: HistoryEntry[] = priorMessages
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));
    const normalizedMessage = normalizeMessage(message);
    const activeIntent = options.intent ?? "ordering";
    const infoItemIds = detectItemIds(normalizedMessage);
    const previousPennyText = lastPennyText(priorMessages);

    addMessage({ id: uuidv4(), role: "user", text: message, ts: Date.now() });

    function finishLocal(reply: string, intent: PennyIntent, chips?: string[]) {
      addMessage({ id: uuidv4(), role: "penny", text: reply, ts: Date.now(), chips });
      return { reply, chips, intent };
    }

    function startConfirmation(linesToConfirm: CartLine[]) {
      return finishLocal(
        `Your order is ${summarizeLines(linesToConfirm)}. Total to pay is $${amountDue(linesToConfirm).toFixed(2)}. Important: that includes a ${Math.round(TIP_RATE * 100)}% tip of $${tipAmount(linesToConfirm).toFixed(2)}. Say I confirm and I'll place it, or tell me what else to add.`,
        "confirming",
        ["I confirm", "Cancel order", "I also want..."]
      );
    }

    if (isInfoQuery(normalizedMessage) && infoItemIds.length) {
      return finishLocal(`${formatMenuInfo(infoItemIds[0])} Want to add it, or hear about something else?`, "ordering");
    }

    if (isMenuOverviewQuery(normalizedMessage)) {
      return finishLocal(formatMenuOverview(), "ordering");
    }

    if (CANCEL_PHRASES.has(normalizedMessage)) {
      pendingAddsRef.current = [];
      useCartStore.getState().clear();
      return finishLocal(
        "Sorry to hear that — I cancelled the order. We can start fresh whenever you're ready.",
        "cancelled"
      );
    }

    if (isOrderReadbackQuery(normalizedMessage)) {
      if (!currentLines.length) {
        return finishLocal("There isn't anything in the order yet. Tell me what sounds good.", "ordering");
      }

      if (activeIntent === "confirming") {
        return startConfirmation(currentLines);
      }

      return finishLocal(formatOrderReadback(currentLines), "ordering", [
        "Yes, that's all",
        "I also want...",
        "Cancel order"
      ]);
    }

    if (isRepeatLastReplyQuery(normalizedMessage)) {
      if (previousPennyText) {
        return finishLocal(previousPennyText, activeIntent);
      }
    }

    if (activeIntent === "confirming") {
      if (CONFIRM_PHRASES.has(normalizedMessage) && currentLines.length) {
        return finishLocal("I confirm — placing it now.", "confirmed");
      }

      if (AFFIRMATIVE_PHRASES.has(normalizedMessage)) {
        return finishLocal(
          "Say I confirm when you're ready and I'll place it.",
          "confirming",
          ["I confirm", "Cancel order", "I also want..."]
        );
      }
    }

    const saidYesToCloseoutQuestion =
      activeIntent !== "confirming" &&
      AFFIRMATIVE_PHRASES.has(normalizedMessage) &&
      isCloseoutQuestion(previousPennyText);

    const isClarifyingCurrentItem = isPendingClarificationReply(normalizedMessage, previousPennyText);

    if (
      activeIntent !== "confirming" &&
      !isClarifyingCurrentItem &&
      (CLOSEOUT_PHRASES.has(normalizedMessage) || saidYesToCloseoutQuestion)
    ) {
      if (!currentLines.length) {
        return finishLocal("I don't have anything in the order yet. Tell me what sounds good.", "ordering");
      }

      return startConfirmation(currentLines);
    }

    const deterministicLines = parseDeterministicOrderRequest(normalizedMessage);
    const pendingLines = pendingAddsRef.current;

    try {
      const result = await parseOrder(message, currentLines, sessionId, history);

      if (currentLines.length && onlyNoopActions(result.actions) && isBackendCloseoutReply(result.reply)) {
        return startConfirmation(currentLines);
      }

      if (hasCartMutation(result.actions) && !canLatestTurnMutateCart(normalizedMessage, previousPennyText, currentLines)) {
        const reply = currentLines.length
          ? formatOrderReadback(currentLines)
          : "I haven't changed the order. Tell me what you'd like to add.";
        addMessage({ id: uuidv4(), role: "penny", text: reply, ts: Date.now() });
        return { reply, intent: "ordering" };
      }

      const reconciled = reconcileCartEffect({
        currentLines,
        deterministicLines,
        normalizedMessage,
        pendingLines,
        reply: cleanRepeatedPrompts(result.reply, currentLines, result.actions),
        actions: result.actions,
        cartEffect: result.cartEffect
      });
      pendingAddsRef.current = reconciled.pendingLines;
      applyActions(reconciled.actions);
      const reply = reconciled.reply;
      addMessage({ id: uuidv4(), role: "penny", text: reply, ts: Date.now() });
      return { reply, intent: result.intent ?? "ordering" };
    } catch {
      const fallback = "Sorry, I missed that — try again?";
      addMessage({ id: uuidv4(), role: "penny", text: fallback, ts: Date.now() });
      return { reply: fallback, intent: "ordering" };
    }
  }

  return { handleSend };
}
