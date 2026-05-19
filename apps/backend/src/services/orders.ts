import type { PlacedOrder } from "../types/order.js";

// In-memory order store.
//
// Real production would back this with a DB; for a demo we just want the
// backend to be the source of truth for "is this order still active?" so that
// the CLI can mark an order fulfilled and the mobile client picks it up on
// next poll. Restarting the backend wipes everything, which is desirable for
// a demo run.
const orders = new Map<string, PlacedOrder>();

export function saveOrder(order: PlacedOrder): PlacedOrder {
  orders.set(order.id, order);
  return order;
}

export function getOrder(id: string): PlacedOrder | undefined {
  return orders.get(id);
}

export function listOrders(): PlacedOrder[] {
  return Array.from(orders.values()).sort((a, b) => b.placedAt - a.placedAt);
}

export function fulfillOrder(id: string): PlacedOrder | undefined {
  const existing = orders.get(id);
  if (!existing) return undefined;
  const updated: PlacedOrder = {
    ...existing,
    status: "fulfilled",
    fulfilledAt: Date.now()
  };
  orders.set(id, updated);
  return updated;
}

export function deleteOrder(id: string): boolean {
  return orders.delete(id);
}
