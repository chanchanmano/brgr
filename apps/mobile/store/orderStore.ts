import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MENU } from "../data/menu";
import type { CartLine, OrderStatus, PlacedOrder } from "../types/order";

const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;
const DEFAULT_TIP_RATE = 0.15;
const HISTORY_CAP = 20; // keep the most recent 20 orders

type OrderStore = {
  currentOrder: PlacedOrder | null;
  history: PlacedOrder[];
  hydrated: boolean;
  placeOrder: (lines: CartLine[], tipRate?: number) => PlacedOrder | null;
  setStatus: (status: OrderStatus) => void;
  /** Wipe the current active order without archiving. Used when the backend
   *  forgets the order (404) — there's nothing meaningful to remember. */
  clearOrder: () => void;
  /** Move the current order into history (whatever its status) and free up
   *  the active slot so the user can place a new one. */
  archiveCurrentOrder: () => void;
  setHydrated: () => void;
};

const menuById = new Map(MENU.map((item) => [item.id, item]));

function makeOrderId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      currentOrder: null,
      history: [],
      hydrated: false,
      placeOrder: (lines, tipRate = DEFAULT_TIP_RATE) => {
        const orderLines = lines
          .map((line) => {
            const item = menuById.get(line.itemId);
            if (!item) return null;
            return {
              itemId: line.itemId,
              qty: line.qty,
              note: line.note,
              name: item.name,
              unitPrice: item.price,
              lineTotal: item.price * line.qty,
              kcal: item.kcal
            };
          })
          .filter((line): line is NonNullable<typeof line> => Boolean(line));

        if (!orderLines.length) return null;

        const subtotal = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
        const taxes = subtotal * TAX_RATE;
        const tip = subtotal * tipRate;
        const total = subtotal + taxes + DELIVERY_FEE + tip;
        const order: PlacedOrder = {
          id: makeOrderId(),
          lines: orderLines,
          subtotal,
          taxes,
          deliveryFee: DELIVERY_FEE,
          tipRate,
          tip,
          total,
          placedAt: Date.now(),
          etaMinutes: 12,
          paymentLabel: "VISA •••• 4242",
          status: "placed"
        };

        set({ currentOrder: order });
        return order;
      },
      setStatus: (status) =>
        set((state) =>
          state.currentOrder
            ? {
                currentOrder: {
                  ...state.currentOrder,
                  status,
                  fulfilledAt: status === "fulfilled" ? Date.now() : state.currentOrder.fulfilledAt
                }
              }
            : state
        ),
      clearOrder: () => set({ currentOrder: null }),
      archiveCurrentOrder: () =>
        set((state) => {
          if (!state.currentOrder) return state;
          return {
            currentOrder: null,
            history: [state.currentOrder, ...state.history].slice(0, HISTORY_CAP)
          };
        }),
      setHydrated: () => set({ hydrated: true })
    }),
    {
      name: "brgr-order",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ currentOrder: state.currentOrder, history: state.history }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);
