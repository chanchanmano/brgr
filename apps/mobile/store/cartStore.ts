import { create } from "zustand";

import { MENU } from "../data/menu";
import type { CartLine, OrderAction } from "../types/order";

type CartStore = {
  lines: CartLine[];
  add: (itemId: string, qty: number, note?: string) => void;
  remove: (itemId: string) => void;
  update: (itemId: string, qty: number) => void;
  clear: () => void;
  applyActions: (actions: OrderAction[]) => void;
  total: () => number;
};

const menuPrices = new Map(MENU.map((item) => [item.id, item.price]));

export const useCartStore = create<CartStore>((set, get) => ({
  lines: [],
  add: (itemId, qty, note) =>
    set((state) => {
      const existing = state.lines.find((line) => line.itemId === itemId);

      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.itemId === itemId
              ? {
                  ...line,
                  qty: line.qty + qty,
                  note: note ?? line.note
                }
              : line
          )
        };
      }

      return {
        lines: [...state.lines, { itemId, qty, note }]
      };
    }),
  remove: (itemId) =>
    set((state) => ({
      lines: state.lines.filter((line) => line.itemId !== itemId)
    })),
  update: (itemId, qty) =>
    set((state) => ({
      lines: qty <= 0 ? state.lines.filter((line) => line.itemId !== itemId) : state.lines.map((line) => (line.itemId === itemId ? { ...line, qty } : line))
    })),
  clear: () => set({ lines: [] }),
  applyActions: (actions) => {
    actions.forEach((action) => {
      if (action.type === "add") {
        get().add(action.itemId, action.qty, action.note);
      }

      if (action.type === "remove") {
        get().remove(action.itemId);
      }

      if (action.type === "update") {
        get().update(action.itemId, action.qty);
      }

      if (action.type === "clear") {
        get().clear();
      }
    });
  },
  total: () =>
    get().lines.reduce((sum, line) => {
      const price = menuPrices.get(line.itemId) ?? 0;
      return sum + price * line.qty;
    }, 0)
}));

