export type OrderAction =
  | { type: "add"; itemId: string; qty: number; note?: string }
  | { type: "remove"; itemId: string }
  | { type: "update"; itemId: string; qty: number }
  | { type: "clear" }
  | { type: "none" };

export type PennyIntent = "ordering" | "confirming" | "confirmed" | "cancelled";

export type CartLine = {
  itemId: string;
  qty: number;
  note?: string;
};

export type PlacedOrderLine = CartLine & {
  name: string;
  unitPrice: number;
  lineTotal: number;
  kcal: number;
};

// Lifecycle of a placed order from the kitchen's POV
//  - "placed"    → just confirmed, kitchen is making it
//  - "fulfilled" → kitchen marked it done (via CLI in this demo)
//  - "cancelled" → user cancelled after placing (rare; reserved)
export type OrderStatus = "placed" | "fulfilled" | "cancelled";

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

export type Message = {
  id: string;
  role: "user" | "penny";
  text: string;
  ts: number;
  chips?: string[];
};
