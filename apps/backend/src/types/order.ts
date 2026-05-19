export type CartSnapshotLine = {
  itemId: string;
  qty: number;
  note?: string;
};

export type OrderAction =
  | { type: "add"; itemId: string; qty: number; note?: string }
  | { type: "remove"; itemId: string }
  | { type: "update"; itemId: string; qty: number }
  | { type: "clear" }
  | { type: "none" };

// Drives the conversation UI state on the client:
//  - "ordering"   → normal back-and-forth, mic loop
//  - "confirming" → Penny just summarized + asked for confirmation; show summary card
//  - "confirmed"  → user confirmed; navigate to tracking
//  - "cancelled"  → user cancelled; clear cart, dismiss summary, back to ordering
export type PennyIntent = "ordering" | "confirming" | "confirmed" | "cancelled";
export type CartEffect = "add_now" | "needs_resolution" | "already_in_cart" | "no_cart_change";

export type PennyResponse = {
  reply: string;
  actions: OrderAction[];
  cartEffect?: CartEffect;
  intent?: PennyIntent;
};

export type OrderStatus = "placed" | "fulfilled" | "cancelled";

export type PlacedOrderLine = {
  itemId: string;
  qty: number;
  note?: string;
  name: string;
  unitPrice: number;
  lineTotal: number;
  kcal: number;
};

export type PlacedOrder = {
  id: string;
  lines: PlacedOrderLine[];
  subtotal: number;
  taxes: number;
  deliveryFee: number;
  tipRate: number;
  tip: number;
  total: number;
  placedAt: number;
  etaMinutes: number;
  paymentLabel: string;
  status: OrderStatus;
  fulfilledAt?: number;
};
